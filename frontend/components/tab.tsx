import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

export default function TabComponent() {
    return(
        <Tabs>

            <TabList className="flex justify-center space-x-4 p-4">
            <Tab>Title 1</Tab>
            <Tab>Title 2</Tab>
            </TabList>

            <TabPanel>
            <h2>Any content 1</h2>
            </TabPanel>
            <TabPanel>
            <h2>Any content 2</h2>
            </TabPanel>
        </Tabs>
    )
}