declare global {
    interface Window {
      fbq?: (...args: unknown[]) => void;
      _fbq?: (...args: unknown[]) => void;
    }
  }
  
  export const isMetaPixelReady = (): boolean => {
    return typeof window !== "undefined" && typeof window.fbq === "function";
  };
  
  export const trackMetaEvent = (
    eventName: string,
    params: Record<string, unknown>
  ) => {
    if (!isMetaPixelReady()) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[Meta Pixel] fbq no está disponible para ${eventName}`);
      }
      return;
    }
  
    window.fbq?.("track", eventName, params);
  
    if (process.env.NODE_ENV === "development") {
      console.log(`[Meta Pixel] ${eventName}`, params);
    }
  };