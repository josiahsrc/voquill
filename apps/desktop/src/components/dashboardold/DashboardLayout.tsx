// import { useState } from "react";
// import MenuIcon from "@mui/icons-material/Menu";
// import {
//   AppBar,
//   Avatar,
//   Box,
//   Button,
//   Container,
//   Drawer,
//   IconButton,
//   Stack,
//   Toolbar,
//   Typography,
// } from "@mui/material";
// import { Outlet, useNavigate } from "react-router-dom";
// import { DashboardMenu } from "./DashboardMenu";

// export const DashboardLayout = () => {
//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const navigate = useNavigate();

//   const handleToggleDrawer = () => {
//     setDrawerOpen((prev) => !prev);
//   };

//   const handleNavigateHome = () => {
//     navigate("/");
//   };

//   const handleOpenLegacy = () => {
//     navigate("/legacy");
//   };

//   return (
//     <Box
//       sx={{
//         height: "100%",
//         display: "flex",
//         flexDirection: "column",
//         backgroundColor: (theme) => theme.palette.level0,
//       }}
//     >
//       <AppBar position="static" color="transparent">
//         <Toolbar
//           sx={{
//             gap: 2,
//           }}
//         >
//           <Stack
//             direction="row"
//             alignItems="center"
//             spacing={1.5}
//             onClick={handleNavigateHome}
//             sx={{
//               cursor: "pointer",
//               userSelect: "none",
//             }}
//           >
//             <Avatar
//               sx={{
//                 bgcolor: "goldBg",
//                 color: "goldFg",
//                 fontWeight: 700,
//               }}
//             >
//               V
//             </Avatar>
//             <Stack spacing={0} alignItems="flex-start">
//               <Typography variant="h6" fontWeight={700}>
//                 Voquill
//               </Typography>
//               <Typography variant="caption" color="text.secondary">
//                 Desktop dashboard
//               </Typography>
//             </Stack>
//           </Stack>

//           <Box sx={{ flexGrow: 1 }} />

//           <Stack
//             direction="row"
//             alignItems="center"
//             spacing={1.5}
//             sx={{ display: { xs: "none", sm: "flex" } }}
//           >
//             <Button variant="outlined" onClick={handleOpenLegacy}>
//               Legacy tools
//             </Button>
//           </Stack>

//           <IconButton
//             onClick={handleToggleDrawer}
//             sx={{ display: { xs: "flex", sm: "none" } }}
//             aria-label="Toggle navigation"
//           >
//             <MenuIcon />
//           </IconButton>
//         </Toolbar>
//       </AppBar>

//       <Box
//         sx={{
//           flexGrow: 1,
//           display: "flex",
//           overflow: "hidden",
//         }}
//       >
//         <Box
//           sx={{
//             width: 280,
//             borderRight: (theme) => `1px solid ${theme.palette.divider}`,
//             display: { xs: "none", sm: "flex" },
//             flexDirection: "column",
//             flexShrink: 0,
//             backgroundColor: (theme) => theme.palette.level0,
//           }}
//         >
//           <DashboardMenu />
//         </Box>

//         <Box
//           component="main"
//           sx={{
//             flexGrow: 1,
//             overflowY: "auto",
//             backgroundColor: (theme) => theme.palette.level1,
//           }}
//         >
//           <Container maxWidth="md" sx={{ py: 4 }}>
//             <Outlet />
//           </Container>
//         </Box>
//       </Box>

//       <Drawer
//         variant="temporary"
//         open={drawerOpen}
//         onClose={handleToggleDrawer}
//         ModalProps={{ keepMounted: true }}
//         sx={{
//           display: { xs: "block", sm: "none" },
//           "& .MuiDrawer-paper": { width: 260, boxSizing: "border-box" },
//         }}
//       >
//         <DashboardMenu onChoose={handleToggleDrawer} />
//       </Drawer>
//     </Box>
//   );
// };
