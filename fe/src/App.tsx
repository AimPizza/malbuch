import { useEffect, useState } from "react";
import { ImageCard } from "./components/ui/image-card/image-card";
import { SideBar } from "./components/ui/sidebar/sidebar";
import type { ImageData } from "./types/image";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { API_URL } from "./lib/network-utils";

function App() {
  const [imgData, setImgData] = useState<ImageData[]>([]);
  const [serverOk, setServerOk] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const POLL_EVERY_MS = 20_000;

  const fetchImages = async () => {
    try {
      const res = await fetch(API_URL + "/imageData");
      const data = await res.json();

      if (res.ok) setServerOk(true);
      else setServerOk(false);

      setImgData(data);
    } catch (err) {
      setServerOk(false);
      console.error(err);
      toast.error("Error fetching image metadata");
    }

    setCountdown(Math.floor(POLL_EVERY_MS / 1000));
  };

  useEffect(() => {
    fetchImages();

    const fetchIntervalId = setInterval(fetchImages, POLL_EVERY_MS);

    const countdownIntervalId = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(fetchIntervalId);
      clearInterval(countdownIntervalId);
    };
  }, []);

  return (
    <div>
      <SideBar onImageUploaded={fetchImages} />
      <div className="flex flex-col items-center gap-5 pl-9 pr-9">
        <Toaster richColors expand />
        {serverOk ? (
          imgData.length > 0 ? (
            imgData
              .sort(
                (a, b) =>
                  new Date(b.creation_date).getTime() -
                  new Date(a.creation_date).getTime(),
              )
              .map((item, counter) => (
                <ImageCard
                  imgData={item}
                  key={counter}
                  onImgDeleted={fetchImages}
                />
              ))
          ) : (
            <p>Go on, draw something and upload it</p>
          )
        ) : (
          <div className="flex flex-col items-center">
            <img src="/serverDown.png" alt="Server unavailable" />
            <p className="mt-4 ">
              Trying again in {countdown} seconds... (CTRL+R for instant
              refresh)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
