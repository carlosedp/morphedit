import React, { useState } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  CssBaseline,
  ThemeProvider,
  Stack,
} from "@mui/material";
import Waveform from "./Waveform";
import { useAudioStore } from "./audioStore";
import "./App.css";
import { theme } from "./theme";

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const reset = useAudioStore((state) => state.reset);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleReset = () => {
    // Clear the audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    // Clear the audio store
    reset();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Morphedit Audio Editor
        </Typography>
        <Box mb={2}>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" component="label">
              Open Audio File
              <input
                type="file"
                accept="audio/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={!audioUrl}
            >
              Reset
            </Button>
          </Stack>
        </Box>
        <Container
          id="waveform-container"
          sx={{ border: "1px solid #ccc", padding: 2, borderRadius: 1 }}
        ></Container>
        {audioUrl && <Waveform audioUrl={audioUrl} />}
        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            Beat detection and export features coming soon.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
