import * as React from "react";
import { ChevronDown, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DropdownButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  items?: {
    key: string;
    label: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
  }[];
  onClick?: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  placement?: "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
  icon?: React.ReactNode;
  size?: "default" | "sm" | "lg";
  buttonType?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  dropdownClassName?: string;
  children?: React.ReactNode;
}

export const DropdownButton = React.forwardRef<
  HTMLDivElement,
  DropdownButtonProps
>(
  (
    {
      items = [],
      onClick,
      trigger,
      disabled = false,
      loading = false,
      placement = "bottomRight",
      icon = <ChevronDown className="h-4 w-4" />,
      size = "default",
      buttonType = "default",
      className,
      dropdownClassName,
      children,
      ...props
    },
    ref
  ) => {
    const getPlacementClass = () => {
      switch (placement) {
        case "bottomLeft":
          return "origin-top-left left-0";
        case "topLeft":
          return "origin-bottom-left bottom-full left-0 mb-2";
        case "topRight":
          return "origin-bottom-right bottom-full right-0 mb-2";
        case "bottomRight":
        default:
          return "origin-top-right right-0";
      }
    };

    return (
      <div className="inline-flex rounded-md shadow-sm" ref={ref}>
        <Button
          onClick={onClick}
          disabled={disabled || loading}
          size={size}
          variant={buttonType}
          className={cn("rounded-r-none", className)}
          {...props}
        >
          {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {children}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={disabled || loading}>
            <Button
              size={size}
              variant={buttonType}
              className={cn("rounded-l-none border-l outline-none", className)}
            >
              {trigger || icon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              "min-w-[160px]",
              getPlacementClass(),
              dropdownClassName
            )}
          >
            <DropdownMenuGroup>
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={cn(item.danger && "text-red-600")}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);

DropdownButton.displayName = "DropdownButton";
