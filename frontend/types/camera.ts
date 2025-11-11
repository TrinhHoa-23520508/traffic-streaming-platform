// types/camera.ts

export interface CameraLocation {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
}

export interface CameraValues {
    ip: string;
}

export interface Camera {
    _id: string;
    id: string;
    name: string;
    loc: CameraLocation;
    values: CameraValues;
    dist: string;
    ptz: boolean;
    angle: number;
    liveviewUrl: string;
}
