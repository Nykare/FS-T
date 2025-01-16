const downloadFile = ({ fileName, base64Data }) => {

    if(!base64Data){
      console.error("Base64 data is missing");
      setErrorStr("Base64 data is missing"); setErrorStr("File name is missing"); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      return;
    }

    if(!fileName){
      console.error("File name is missing");
      setErrorStr("File name is missing"); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      return;
    }

    const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

    try{
      // Decode Base64
      const byteCharacters = atob(base64Content);
      const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);

      // Create Blob
      const blob = new Blob([byteArray]);
      const url = URL.createObjectURL(blob);

      // Create and trigger download link
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }catch (error){
      console.error("Failed to process Base64 data:", error);
    }
  };

export default downloadFile;