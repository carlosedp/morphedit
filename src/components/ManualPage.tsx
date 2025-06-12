import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { marked } from "marked";
import { theme } from "../theme";

interface ManualPageProps {
  onBack: () => void;
}

export const ManualPage: React.FC<ManualPageProps> = ({ onBack }) => {
  const [manualContent, setManualContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadManual = async () => {
      try {
        // Load the USER_MANUAL.md content
        const response = await fetch("/USER_MANUAL.md");
        const markdownText = await response.text();

        // Configure marked options
        marked.setOptions({
          breaks: true,
          gfm: true,
        });

        // Convert markdown to HTML
        const htmlContent = await marked(markdownText);
        setManualContent(htmlContent);
      } catch (error) {
        console.error("Error loading manual:", error);
        setManualContent("<p>Error loading manual content.</p>");
      } finally {
        setIsLoading(false);
      }
    };

    loadManual();
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container>
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="h6">Loading manual...</Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MorphEdit User Manual
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper
          elevation={2}
          sx={{
            p: 5,
            textAlign: "left",
            strong: {
              color: theme.palette.primary.main,
              fontWeight: "bold",
              fontSize: "1.1em",
            },
            a: {
              color: theme.palette.primary.main,
              textDecoration: "underline",
              "&:hover": {
                textDecoration: "underline",
              },
            },
            "& img": {
              maxWidth: "100%",
              height: "auto",
              borderRadius: 1,
              boxShadow: 2,
              my: 2,
            },
            "& h1": {
              textAlign: "center",
              color: theme.palette.primary.main,
              borderBottom: `2px solid ${theme.palette.primary.main}`,
              paddingBottom: 1,
              marginBottom: 3,
            },
            "& h2": {
              textAlign: "center",
              color: theme.palette.primary.main,
              marginTop: 4,
              marginBottom: 2,
            },
            "& h3": {
              color: theme.palette.text.primary,
              marginTop: 3,
              marginBottom: 1.5,
            },
            "& code": {
              backgroundColor: theme.palette.grey[900],
              color: theme.palette.text.primary,
              padding: "2px 4px",
              borderRadius: 1,
              fontSize: "0.875em",
            },
            "& pre": {
              backgroundColor: theme.palette.grey[900],
              padding: 2,
              borderRadius: 1,
              overflow: "auto",
              "& code": {
                backgroundColor: "transparent",
                padding: 0,
              },
            },
            "& blockquote": {
              borderLeft: `4px solid ${theme.palette.primary.main}`,
              paddingLeft: 2,
              margin: 2,
              fontStyle: "italic",
              backgroundColor: theme.palette.grey[50],
              padding: 2,
              borderRadius: 1,
            },
            "& table": {
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 2,
              marginBottom: 2,
            },
            "& th, & td": {
              border: `1px solid ${theme.palette.grey[300]}`,
              padding: 1,
              textAlign: "left",
            },
            "& th": {
              backgroundColor: theme.palette.grey[900],
              fontWeight: "bold",
            },
            "& ul, & ol": {
              paddingLeft: 3,
              textAlign: "left",
            },
            "& li": {
              marginBottom: 0.5,
              textAlign: "left",
            },
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: manualContent }} />
        </Paper>

        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={onBack}
            startIcon={<ArrowBack />}
          >
            Back to Editor
          </Button>
        </Box>
      </Container>
    </ThemeProvider>
  );
};
