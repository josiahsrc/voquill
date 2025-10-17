// import {
//   DashboardCustomizeOutlined,
//   HistoryOutlined,
// } from "@mui/icons-material";
// import {
//   Box,
//   List,
//   ListItemButton,
//   ListItemIcon,
//   ListItemText,
//   Stack,
// } from "@mui/material";
// import { useLocation, useNavigate } from "react-router-dom";

// const navItems = [
//   { label: "Dashboard", path: "/", icon: <DashboardCustomizeOutlined /> },
//   { label: "Legacy", path: "/legacy", icon: <HistoryOutlined /> },
// ];

// export type DashboardMenuProps = {
//   onChoose?: () => void;
// };

// export const DashboardMenu = ({ onChoose }: DashboardMenuProps) => {
//   const location = useLocation();
//   const navigate = useNavigate();

//   const handleNavigate = (path: string) => {
//     navigate(path);
//     onChoose?.();
//   };

//   return (
//     <Stack alignItems="stretch" sx={{ height: "100%" }}>
//       <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
//         <List
//           sx={{
//             px: { xs: 1, sm: 2 },
//             pt: { xs: 2, sm: 0 },
//             pb: 8,
//             display: "flex",
//             flexDirection: "column",
//             gap: 1,
//           }}
//         >
//           {navItems.map(({ label, path, icon }) => {
//             const selected =
//               path === "/"
//                 ? location.pathname === path
//                 : location.pathname.startsWith(path);
//             return (
//               <ListItemButton
//                 key={path}
//                 onClick={() => handleNavigate(path)}
//                 selected={selected}
//                 sx={{
//                   borderRadius: 2,
//                   "&.Mui-selected": (theme) => ({
//                     backgroundColor: theme.palette.goldBg,
//                     color: theme.palette.goldFg,
//                     "& .MuiListItemIcon-root": {
//                       color: theme.palette.goldFg,
//                     },
//                     "&:hover": {
//                       backgroundColor: theme.palette.goldBg,
//                     },
//                   }),
//                 }}
//               >
//                 <ListItemIcon
//                   sx={{
//                     color: "inherit",
//                     minWidth: 40,
//                   }}
//                 >
//                   {icon}
//                 </ListItemIcon>
//                 <ListItemText
//                   primary={label}
//                   primaryTypographyProps={{ fontWeight: 600 }}
//                 />
//               </ListItemButton>
//             );
//           })}
//         </List>
//       </Box>
//     </Stack>
//   );
// };
