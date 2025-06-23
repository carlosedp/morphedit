import { createTheme } from "@mui/material/styles";

// Define custom breakpoints and responsive values
const theme = createTheme({
  cssVariables: true,
  breakpoints: {
    values: {
      xs: 0,
      sm: 480,
      md: 768,
      lg: 1024,
      xl: 1200,
    },
  },
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
  components: {
    // Global responsive styles
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        // Root container styling (replacement for #root in CSS)
        "#root": {
          width: "100%",
          margin: "0 auto",
          padding: "2rem",
          textAlign: "center",
          [theme.breakpoints.down("md")]: {
            padding: "1rem 0.5rem",
          },
          [theme.breakpoints.down("sm")]: {
            padding: "0.5rem 0.25rem",
          },
        },
        // Logo styling (if still needed)
        ".logo": {
          height: "6em",
          padding: "1.5em",
          willChange: "filter",
          transition: "filter 300ms",
          borderRadius: "50%",
          "&:hover": {
            filter: "drop-shadow(0 0 2em #646cffaa)",
          },
          "&.react:hover": {
            filter: "drop-shadow(0 0 2em #61dafbaa)",
          },
        },
        // Animation
        "@keyframes logo-spin": {
          from: {
            transform: "rotate(0deg)",
          },
          to: {
            transform: "rotate(360deg)",
          },
        },
        // Prevent horizontal scrolling on very small screens
        [theme.breakpoints.down("sm")]: {
          "*": {
            maxWidth: "100% !important",
            boxSizing: "border-box !important",
          },
        },
      }),
    },
    // Responsive button styling
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("md")]: {
            fontSize: "0.9rem",
            padding: "0.6em 1em",
            minWidth: "auto",
          },
          [theme.breakpoints.down("sm")]: {
            fontSize: "0.85rem",
            padding: "0.5em 0.8em",
          },
        }),
      },
    },
    // Responsive IconButton styling
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            padding: "8px",
          },
        }),
      },
    },
    // Responsive TextField styling
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("md")]: {
            minWidth: "80px",
          },
        }),
      },
    },
    // Responsive Slider styling
    MuiSlider: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("md")]: {
            minWidth: "120px",
          },
        }),
      },
    },
    // Responsive Container styling
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: "8px",
            paddingRight: "8px",
          },
        }),
      },
    },
  },
});

export { theme };
