import React, { useState } from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import Waveform from './Waveform';
import './App.css';

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Morphedit Audio Editor
      </Typography>
      <Box mb={2}>
        <Button variant="contained" component="label">
          Open Audio File
          <input type="file" accept="audio/*" hidden onChange={handleFileChange} />
        </Button>
      </Box>
      {audioUrl && <Waveform audioUrl={audioUrl} />}
      <Box mt={4}>
        <Typography variant="body2" color="text.secondary">
          Beat detection and export features coming soon.
        </Typography>
      </Box>
    </Container>
  );
}

export default App;
