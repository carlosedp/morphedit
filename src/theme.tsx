import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    background: {
      default: "#242424",
      paper: "#333",
    },
    primary: {
      main: "#ffd000",
      light: "#fbf0bf",
      dark: "#ffd0003d",
      contrastText: "#242424",
    },
    secondary: {
      main: "#333",
      contrastText: "#ccb034",
    },
    text: {
      primary: "#ffd000",
      secondary: "#fff",
    },
  },
  typography: {
    fontFamily: "Roboto Mono, monospace",
  },
});
