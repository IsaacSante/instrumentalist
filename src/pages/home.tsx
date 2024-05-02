import React, { useState, useEffect } from "react";
import HandTracking from "../components/handTracking";
import Layout from "../components/layout/layout";
import { debounce } from "../utils/functions/debounce";

type HomeProps = {
  devMode?: boolean;
};

const Home: React.FC<HomeProps> = ({ devMode = false }) => {
  const [isMobile, setIsMobile] = useState(true);
  const [hasRendered, setHasRendered] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
      setHasRendered(true);
    };

    const debouncedCheckIsMobile = debounce(checkIsMobile, 100);
    checkIsMobile();
    window.addEventListener("resize", debouncedCheckIsMobile);

    return () => {
      window.removeEventListener("resize", debouncedCheckIsMobile);
    };
  }, []);

  if (!hasRendered) {
    return null;
  }

  return (
    <Layout isMobile={isMobile}>
      <div style={{ position: "relative" }}>
        <HandTracking isMobile={isMobile} />
      </div>
    </Layout>
  );
};

export default Home;
