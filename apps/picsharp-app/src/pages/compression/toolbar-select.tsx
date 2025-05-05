// @ts-nocheck
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, MousePointer2 } from "lucide-react";
import useCompressionStore from "@/store/compression";
import useSelector from "@/hooks/useSelector";
import type { MenuProps } from "antd";
import { Dropdown } from "antd";
import { IScheduler } from "@/utils/scheduler";

enum RowSelection {
  ALL = "all",
  INVERT = "invert",
  UNCOMPRESSED = "uncompressed",
  UNSAVED = "unsaved",
}

function ToolbarSelect() {
  const { files, selectedFiles, setSelectedFiles, inSaving, inCompressing } =
    useCompressionStore(
      useSelector([
        "files",
        "selectedFiles",
        "setSelectedFiles",
        "inSaving",
        "inCompressing",
      ])
    );

  const items: MenuProps["items"] = [
    {
      key: RowSelection.ALL,
      label: "All",
      disabled: inCompressing || inSaving,
    },
    {
      key: RowSelection.INVERT,
      label: "Invert",
      disabled: inCompressing || inSaving,
    },
    {
      key: RowSelection.UNCOMPRESSED,
      label: "Uncompressed",
      disabled: inCompressing || inSaving,
    },
    {
      key: RowSelection.UNSAVED,
      label: "Unsaved",
      disabled: inCompressing || inSaving,
    },
  ];

  const handleSelectMode: MenuProps["onClick"] = ({ key }) => {
    switch (key) {
      case RowSelection.ALL:
        setSelectedFiles(files.map((file) => file.id));
        break;
      case RowSelection.INVERT:
        setSelectedFiles(
          files
            .filter((file) => !selectedFiles.includes(file.id))
            .map((file) => file.id)
        );
        break;
      case RowSelection.UNCOMPRESSED:
        setSelectedFiles(
          files
            .filter(
              (file) => file.compressStatus === IScheduler.TaskStatus.Pending
            )
            .map((file) => file.id)
        );
        break;
      case RowSelection.UNSAVED:
        setSelectedFiles(
          files
            .filter(
              (file) => file.compressStatus === IScheduler.TaskStatus.Completed
            )
            .map((file) => file.id)
        );
        break;
    }
  };

  return (
    <Dropdown menu={{ items, onClick: handleSelectMode }} placement="top">
      <Button variant="ghost" size="sm">
        <div className="flex items-center gap-1">
          <MousePointer2 className="w-6 h-6" />
          <ChevronDown className="w-2 h-2" absoluteStrokeWidth />
        </div>
      </Button>
    </Dropdown>
  );
}

export default memo(ToolbarSelect);
