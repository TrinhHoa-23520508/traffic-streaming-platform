import osmnx as ox
import networkx as nx
import logging
import os
import traceback
from threading import Lock

logger = logging.getLogger(__name__)

class RoutingService:
    def __init__(self, place_name=None):
        # Mặc định tải khu vực trung tâm nếu không chỉ định cụ thể
        if place_name is None:
            self.place_name = [
                "District 1, Ho Chi Minh City, Vietnam",
                "District 3, Ho Chi Minh City, Vietnam",
                "District 4, Ho Chi Minh City, Vietnam",
                "District 5, Ho Chi Minh City, Vietnam",
                "District 10, Ho Chi Minh City, Vietnam",
                "Phu Nhuan District, Ho Chi Minh City, Vietnam",
                "Binh Thanh District, Ho Chi Minh City, Vietnam"
            ]
        else:
            self.place_name = place_name
            
        self.lock = Lock()
        self.graph = None
        self._load_graph()

    def _load_graph(self):
        # Configure OSMnx to handle large downloads better
        ox.settings.use_cache = True
        ox.settings.log_console = False
        
        # Ensure data directory exists
        data_dir = "data"
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
            
        # Sanitize place name for filename
        if isinstance(self.place_name, list):
            # Đặt tên chung cho file cache của khu vực trung tâm
            safe_name = "HCMC_Central_Districts"
        else:
            safe_name = self.place_name.replace(" ", "_").replace(",", "")
            
        graph_path = os.path.join(data_dir, f"{safe_name}.graphml")
        osm_path = os.path.join(data_dir, f"{safe_name}.osm")
        
        # Also check for legacy "hcmc.osm" if user uploaded it manually but we want to be flexible
        legacy_osm = os.path.join(data_dir, "hcmc.osm")
        if os.path.exists(legacy_osm) and not os.path.exists(osm_path):
            osm_path = legacy_osm
        
        if os.path.exists(graph_path):
            logger.info(f"Loading cached graph from {graph_path}...")
            self.graph = ox.load_graphml(graph_path)
        elif os.path.exists(osm_path):
            logger.info(f"Found manual OSM file at {osm_path}. Loading...")
            self.graph = ox.graph_from_xml(osm_path)
            # Pre-process graph similar to graph_from_place
            self.graph = ox.add_edge_speeds(self.graph)
            self.graph = ox.add_edge_travel_times(self.graph)
        else:
            logger.info(f"Downloading graph for {self.place_name} (this may take a while)...")
            # custom_filter='["highway"~"motorway|trunk|primary|secondary|tertiary"]' to reduce size if needed
            self.graph = ox.graph_from_place(self.place_name, network_type='drive')
            self.graph = ox.add_edge_speeds(self.graph)
            self.graph = ox.add_edge_travel_times(self.graph)

        # Ensure the graph is always strongly connected to guarantee routing
        # regardless of whether it was downloaded or loaded from cache
        if self.graph:
            logger.info("Ensuring graph is strictly connected (Keep largest component)...")
            try:
                # Try modern osmnx method first
                self.graph = ox.truncate.largest_component(self.graph, strongly=True)
            except AttributeError:
                # Fallback for older osmnx versions
                try:
                    self.graph = ox.utils_graph.get_largest_component(self.graph, strongly=True)
                except AttributeError:
                    # Fallback to pure NetworkX if osmnx utils fail
                    largest_cc = max(nx.strongly_connected_components(self.graph), key=len)
                    self.graph = self.graph.subgraph(largest_cc).copy()


        # --- GLOBAL DATA SANITIZATION ---
        logger.info("Sanitizing graph data types...")
        for u, v, k, data in self.graph.edges(keys=True, data=True):
            try:
                # Force cast to float because GraphML/OSM might load as string
                tt = float(data.get('travel_time', 1))
            except (ValueError, TypeError):
                tt = 1.0
            
            # Update travel_time
            data['travel_time'] = tt

            # Initialize or fix impedance
            if 'impedance' not in data:
                data['impedance'] = tt
            else:
                try:
                    data['impedance'] = float(data['impedance'])
                except (ValueError, TypeError):
                    data['impedance'] = tt
        
        # Save cache for next time (clean data)
        try:
            abs_path = os.path.abspath(graph_path)
            logger.info(f"Saving graph data to: {abs_path}")
            ox.save_graphml(self.graph, graph_path)
            logger.info("Graph saved successfully.")
            
            # Verify file exists
            if os.path.exists(graph_path):
                logger.info(f"Verified: File exists at {abs_path} Size: {os.path.getsize(graph_path)} bytes")
            else:
                logger.error(f"File missing after write at {abs_path}")
                
        except Exception as e:
            logger.warning(f"Could not save graph cache: {e}")
                
        logger.info("Graph loaded and sanitized successfully.")

    def update_traffic(self, lat, lon, vehicle_count):
        """
        Update the impedance (weight) of the nearest edge based on vehicle count.
        """
        if not self.graph:
            return

        try:
            # osmnx uses (x, y) = (lon, lat)
            u, v, key = ox.nearest_edges(self.graph, X=lon, Y=lat)
            
            with self.lock:
                edge_data = self.graph[u][v][key]
                base_time = edge_data.get('travel_time', 1)
                
                # Heuristic: 
                # < 5 vehicles: normal speed
                # > 50 vehicles: heavily congested (e.g. 5x slower)
                congestion_factor = 1.0 + (vehicle_count / 10.0) 
                
                new_impedance = base_time * congestion_factor
                
                self.graph[u][v][key]['impedance'] = new_impedance
                
                logger.debug(f"Traffic Update: Edge {u}-{v} | Count: {vehicle_count} | Impedance: {base_time:.2f} -> {new_impedance:.2f}")
        except Exception as e:
            logger.error(f"Error updating traffic: {e}")

    def get_shortest_path(self, start_lat, start_lon, end_lat, end_lon):
        if not self.graph:
            raise Exception("Graph not initialized")

        try:
            orig = ox.nearest_nodes(self.graph, X=start_lon, Y=start_lat)
            dest = ox.nearest_nodes(self.graph, X=end_lon, Y=end_lat)
            
            logger.info(f"Routing request: {start_lat},{start_lon} -> {end_lat},{end_lon}")
            logger.info(f"Nearest nodes: Origin={orig}, Dest={dest}")
            
            # Check if origin and destination are the same
            if orig == dest:
                 logger.warning("Origin and Destination nodes are identical.")
            
            # Calculate shortest path using traffic-weighted impedance
            route_nodes = nx.shortest_path(self.graph, orig, dest, weight='impedance')
            
            # Calculate metrics
            total_distance = 0
            total_duration = 0
            path_coords = []
            
            for i in range(len(route_nodes)):
                node_id = route_nodes[i]
                node = self.graph.nodes[node_id]
                # osmnx nodes are (x, y) = (lon, lat)
                path_coords.append([node['x'], node['y']]) # GeoJSON format: [lon, lat]
                
                if i < len(route_nodes) - 1:
                    u = route_nodes[i]
                    v = route_nodes[i+1]
                    # Get edge data (taking the first key for simplicity in MultiGraph)
                    # Use safety get
                    edge_dict = self.graph[u][v]
                    if edge_dict:
                        edge_data = list(edge_dict.values())[0]
                        total_distance += edge_data.get('length', 0)
                        total_duration += edge_data.get('travel_time', 0)

            return {
                "coordinates": path_coords,
                "distance": total_distance,
                "duration": total_duration
            }
        except nx.NetworkXNoPath:
            logger.warning("No path found between points.")
            return []
        except Exception as e:
            logger.error(f"Routing error: {e}")
            logger.error(traceback.format_exc())
            return []

