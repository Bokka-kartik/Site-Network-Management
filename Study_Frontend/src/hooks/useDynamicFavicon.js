import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_META = {
  "/studies": {
    icon: "https://cdn-icons-png.flaticon.com/512/3209/3209265.png",
    title: "Studies · Study Portal",
  },
  "/sites": {
    icon: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    title: "Sites · Study Portal",
  },
  "/examiners": {
    icon: "https://cdn-icons-png.flaticon.com/512/3774/3774299.png",
    title: "Examiners · Study Portal",
  },
  "/home": {
    icon: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
    title: "Home · Study Portal",
  },
};

const DEFAULT = {
  icon: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
  title: "Study Portal",
};

const useDynamicFavicon = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = Object.keys(ROUTE_META).find((r) => pathname.startsWith(r));
    const { icon, title } = match ? ROUTE_META[match] : DEFAULT;

    document.title = title;

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = icon;
  }, [pathname]);
};

export default useDynamicFavicon;
