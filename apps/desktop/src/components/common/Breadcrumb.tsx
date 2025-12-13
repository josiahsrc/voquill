import { Box, Link, Typography } from "@mui/material";
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  separator?: string;
};

export const Breadcrumb = ({ items, separator = "/" }: BreadcrumbProps) => {
  const navigate = useNavigate();

  const handleClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      navigate(item.href);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 2,
        minWidth: 0,
      }}
    >
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {separator}
            </Typography>
          )}
          {index === items.length - 1 ? (
            <Typography
              variant="body2"
              color="text.primary"
              fontWeight={500}
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {item.label}
            </Typography>
          ) : (
            <Link
              component="button"
              variant="body2"
              color="text.secondary"
              onClick={() => handleClick(item)}
              sx={{
                cursor: "pointer",
                textDecoration: "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </Box>
  );
};
