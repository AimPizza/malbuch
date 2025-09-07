import { UploadElement } from "@/components/ui/sidebar/upload-element";
import { Card } from "../card";

interface Props {
  onImageUploaded: () => void;
}

function SideBar({ onImageUploaded }: Props) {
  return (
    <>
      <Card className="bg-brand-alt border-brand fixed left-0 top-0 h-[calc(100vh-32px)] w-16 mt-4 ml-2 mr-2 mb-4 flex flex-col items-center py-4">
        <UploadElement onUploaded={onImageUploaded} />
      </Card>
    </>
  );
}

export { SideBar };
