import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/layouts/MainLayout";
import { CreateCampaign } from "./components/screens/CreateCampaign";
import { TemplateGallery } from "./components/screens/TemplateGallery";
import { CampaignWorkspace } from "./components/screens/CampaignWorkspace";
import { PlaceholderScreen } from "./components/screens/PlaceholderScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { 
        index: true, 
        Component: CampaignWorkspace 
      },
      { 
        path: "create", 
        Component: CreateCampaign 
      },
      { 
        path: "templates", 
        Component: TemplateGallery 
      },
      { 
        path: "campaign/:id", 
        Component: CampaignWorkspace 
      },
      { 
        path: "orders", 
        Component: PlaceholderScreen 
      },
      { 
        path: "creatives", 
        Component: PlaceholderScreen 
      },
      { 
        path: "inventory", 
        Component: PlaceholderScreen 
      },
      { 
        path: "reports", 
        Component: PlaceholderScreen 
      },
      { 
        path: "faktura", 
        Component: PlaceholderScreen 
      },
      { 
        path: "inntekt", 
        Component: PlaceholderScreen 
      },
      { 
        path: "priser", 
        Component: PlaceholderScreen 
      },
      { 
        path: "admin", 
        Component: PlaceholderScreen 
      },
      { 
        path: "*", 
        Component: PlaceholderScreen 
      },
    ],
  },
]);