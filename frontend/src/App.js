import React, { useState, useEffect } from 'react';
import Button from './components/button/Button';
import './styles/global.css';
import './styles/app.css';
import formatDate from './utils/formatDate';
import downloadFile from './utils/downloadFile';
import apiClient from "./config/api";

const App = () => {

  const errorFadeOutTime = 5000;

  const [isPopUpOpen, setIsPopUpOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsList, setDocumentsList] = useState([]);
  const [visibleExtra, setVisibleExtra] = useState(null);
  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [file, setFile] = useState(null);
  const [base64, setBase64] = useState("");
  const [buttonProcessDisabled, setButtonProcessDisabled] = useState(true);
  const [extractedValues, setExtractedValues] = useState([]);
  const [errorStr, setErrorStr] = useState("");
  const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];

  useEffect(() => {
    if(documentsLoading) fetchDocuments();
  }, [documentsLoading]);

  /* Interface */

  const openPopUp = async () => {
    setErrorStr("");
    setIsPopUpOpen(true);
    setExtractedValues([]);
    setIsProcessing(false);
    setFile(null);
    setBase64("");
    setStep(1);
  };

  const closePopUp = async () => {
    setIsPopUpOpen(false);
    setIsConfirmationOpen(false);
    setVisibleExtra(null);
  };

  const showExtra = (index) => {
    setVisibleExtra(index);
  };

  const fetchDocuments = async () => {
    try{

      const response = await apiClient.get("/loadDocuments");
      const result = response.data;

      let resultFormatted = [];
      result.forEach(resultEntry => {
        let resultTemp = {};
        let valuesCount = 0;
        let valuesSet = 0;
        let confidenceSum = 0;
        let confidenceCount = 0;
        resultTemp['dateProcessed'] = resultEntry.dateProcessed;
        resultTemp['name'] = resultEntry.name;
        resultTemp['file'] = resultEntry.file;
        resultTemp['data'] = [];
        resultEntry.data.forEach(dataItem => {
          let dataTemp = {}
          dataTemp['type'] = dataItem.name;
          let value = dataItem.values[0];
          if(value.confidence_score > 0){
            confidenceSum += value.confidence_score;
            confidenceCount++;
          }
          if(value.value !== null){
            valuesSet++;
          }
          valuesCount++;
          dataTemp['value'] = value.value;
          dataTemp['confidence'] = value.confidence_score;
          resultTemp['data'].push(dataTemp);
        });
        resultTemp['dataCount'] = valuesCount;
        resultTemp['successRate'] = 0;
        if(valuesCount>0){
          resultTemp['successRate'] = valuesSet/valuesCount;
        }
        resultTemp['confidenceRate'] = 0;
        if(confidenceCount>0){
          resultTemp['confidenceRate'] = confidenceSum/confidenceCount;
        }

        resultFormatted.push(resultTemp);
      });
      setDocumentsList(resultFormatted);
      setDocumentsLoading(false);
    }catch(error){
      console.error('Error fetching documents:', error);
    }
  };

  const deleteDocuments = async () => {
    try{
      await apiClient.delete("/deleteDocuments");
      setIsConfirmationOpen(false);
      setDocumentsLoading();
      setDocumentsList([]);
      fetchDocuments();
    }catch(error){
      console.error('Error deleting documents:', error);
    }
  };

  /* Processing data */

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleHover = (e) => {
    e.preventDefault();
    setIsHover(true);
  };

  const handleHoverLeave = () => {
    setIsHover(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    validateAndConvertFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    validateAndConvertFile(e.target.files[0]);
  };

  const validateAndConvertFile = (file) => {
    if(file && supportedTypes.includes(file.type)){
      setErrorStr("");
      setFile(file);
      if(apiKey){
        setButtonProcessDisabled(false);
      }

      // Convert the file to Base64
      const reader = new FileReader();
      reader.onload = () => setBase64(reader.result.split(",")[1]);
      reader.onerror = () => setErrorStr("Error reading the file. Please try again."); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      reader.readAsDataURL(file);
    }else{
      setErrorStr("Unsupported file type. Please upload a PDF, JPG, PNG, or TIFF."); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      setFile(null);
      setBase64("");
      setButtonProcessDisabled(true);
    }
  };

  const processData = async () => {
    if(buttonProcessDisabled) return;

    if(!base64 || !file || !file.name){
      setErrorStr("Something is wrong with file"); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      return;
    }

    if(!apiKey){
      setErrorStr("API key missing"); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      return;
    }

    setIsProcessing(true);
    setButtonProcessDisabled(true);

    try{
      const response = await apiClient.post("/extract", { file: base64, file_name: file.name, document_type_name: "simple-invoice", apiKey: apiKey },{ headers: { "Content-Type": "application/json" } } );
      if(response.statusText != 'OK'){
        setErrorStr("Error: " + response.status + " " + response.statusText); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
        setButtonProcessDisabled(false);
        setIsProcessing(false);
        return;
      }
      const result = response.data;
      setExtractedValues(result.extracted_fields);
      setButtonProcessDisabled(false);
      setIsProcessing(false);
      setStep(2);
    }catch(error){
      console.error("Error extracting file:", error);
      setErrorStr("Error extracting file: " + error); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
      setButtonProcessDisabled(false);
      setIsProcessing(false);
    }
  };

  const saveData = async () => {

    if(!file || !extractedValues.length){
      setErrorStr("No data to save.");
      return;
    }

    setErrorStr("");

    try{
      await apiClient.post("/saveDocument", { name: file.name, data: extractedValues, file: base64 }, { headers: { "Content-Type": "application/json" } });
      setDocumentsLoading();
      setDocumentsList([]);
      fetchDocuments();
      setStep(3);
    }catch(error){
      console.error("Error saving file:", error);
      setErrorStr("Error saving file: " + error); setTimeout(() => { setErrorStr(""); }, errorFadeOutTime);
    }
  };

  const processAnother = async () => {
    setFile(null);
    setBase64('');
    setButtonProcessDisabled(true);
    setStep(1);
  };

  return (
  <div className="frame">
   {documentsLoading && <div className="loader display"></div>}
   {!documentsLoading && documentsList.length === 0 ?
    <div className="empty_state">
        <div className="title">No documents</div>
        <div className="text">Upload and process new document</div>
        <Button className="green" label="Upload new document" onClick={() => openPopUp()} />
    </div>
    : null }
    {!documentsLoading && documentsList.length > 0 ?
    <div className="documents">
      <div className="title_row">
        <h1>Documents</h1>
        <Button className="green" label="Upload new document" onClick={() => openPopUp()} />
      </div>
      <div className="table">
        <div className="row row_header">
          <div className="col col_name">Document</div>
          <div className="col col_date">Date processed</div>
          <div className="col col_data">Exctracted data</div>
          <div className="col col_confidence">Confidence</div>
          <div className="col col_success">Success</div>
        </div>
        {documentsList.map((field, index) => (
          <div key={index} className="row">
            <div className="col col_name" onClick={() => downloadFile({ fileName: field.name, base64Data: field.file })}><div className="icon doc"></div>{field.name}</div>
            <div className="col col_date" data-responsive="Date processed">{formatDate(field.dateProcessed)}</div>
            <div className="col col_data">
              <div className="extracted_button" onClick={() => showExtra(index)}>Show {field.dataCount}</div>
              <div className={`extracted_extra ${ visibleExtra === index ? 'display' : '' }`}>
                 <div className="title_row">
                  <div className="title">{field.name}</div>
                  <div className="close" onClick={closePopUp}><div className="icon_close"></div></div>
                </div>
                 <div className="extracted_values">
                  <div className="extracted_row row_header">
                    <div className="extracted_col col_name">Name</div>
                    <div className="extracted_col col_value">Value</div>
                    <div className="extracted_col col_confidence">Confidence</div>
                  </div>
                  {(field.data).map((dataItem, dataIndex) => (
                    <div key={dataIndex} className="extracted_row">
                      <div className="extracted_col col_name">
                        {dataItem.type.charAt(0).toUpperCase() + dataItem.type.slice(1).replaceAll('_', ' ')}
                      </div>
                      <div className="extracted_col col_value">
                        {dataItem.value}
                      </div>
                      <div className="extracted_col col_confidence">
                        <div className="progress"><div className="bar" style={{ width: `${100 * dataItem.confidence}%` }}></div></div>
                        <label>{dataItem.confidence > 0 ? `${(100*dataItem.confidence).toFixed(0)}%` : '-'}</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col col_confidence" data-responsive="Confidence">
              <div className="progress"><div className="bar" style={{ width: `${100 * field.confidenceRate}%` }}></div></div>
              <label>{field.confidenceRate > 0 ? `${(100*field.confidenceRate).toFixed(0)}%` : '-'}</label>
            </div>
            <div className="col col_success" data-responsive="Success">
              <div className="progress"><div className="bar" style={{ width: `${100 * field.successRate}%` }}></div></div>
              <label>{field.successRate > 0 ? `${(100*field.successRate).toFixed(0)}%` : '-'}</label>
            </div>
          </div>
        ))}
      </div>
      <div className="small_buttons">
        <div className="small_button" onClick={() => setIsConfirmationOpen(true)}>Clear documents</div>
      </div>
    </div>
    : null}
    <div className={`box ${isProcessing ? "processing" : ""} ${isPopUpOpen ? "display" : ""}`}>
      <div className="close" onClick={closePopUp}><div className="icon_close"></div></div>
      <div className={`step step_1 ${step==1 ? "current" : ""}`}>
        <div className="title">Document upload</div>
        <div className="input_row">
          <div className="icon key"></div>
          <div className="label">typless API key</div>
          <input type="text" placeholder="Token 51784ffc18640bf893a2f8a1dee3cdf2" value={apiKey} onChange={(e) => {
            setApiKey(e.target.value);
            if(file){ setButtonProcessDisabled(false); }
          }}/>
        </div>
        <div className={`upload_box ${isDragging ? "dragover" : ""} ${isHover && !file && !isDragging ? "hover" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onMouseOver={handleHover}
          onMouseOut={handleHoverLeave}
          onClick={() => document.getElementById("file-input").click()}
        >
          <div className={`icon ${file ? "uploaded" : "file"}`}></div>
          <div className="description">
            {file ? `Document loaded: ${file.name}` : "Drag and drop file here or click to upload"}
          </div>
          <input type="file"
            id="file-input"
            accept=".pdf, .jpg, .jpeg, .png, .tiff"
            hidden
            onChange={handleFileChange}/>
        </div>
        {isProcessing ? <div className="loader_box"><div className="loader display"></div></div> : <Button className={`${buttonProcessDisabled ? "disabled" : "green"}`} label="Process" onClick={() => processData()} /> }
      </div>
      <div className={`step step_2 ${step==2 ? "current" : ""}`}>
        <div className="title">Extracted data</div>
        <div className="extracted_values">
          <div className="extracted_row row_header">
            <div className="extracted_col col_name">Name</div>
            <div className="extracted_col col_value">Value</div>
            <div className="extracted_col col_confidence">Confidence</div>
          </div>
          {extractedValues.map((field, index) => (
            <div key={index} className="extracted_row">
              <div className="extracted_col col_name">
                {field.name.charAt(0).toUpperCase() + field.name.slice(1).replaceAll('_', ' ')}
              </div>
              <div className="extracted_col col_value">
                {field.values[0].value !== null ? field.values[0].value : '-'}
              </div>
              <div className="extracted_col col_confidence">
                <div className="progress"><div className="bar" style={{ width: `${100 * field.values[0].confidence_score}%` }}></div></div>
                <label>{field.values[0].confidence_score > 0 ? `${(100*field.values[0].confidence_score).toFixed(0)}%` : '-'}</label>
              </div>
            </div>
          ))}
        </div>
        <Button className="green" label="Save" onClick={() => saveData()} />
      </div>
      <div className={`step step_3 ${step==3 ? "current" : ""}`}>
        <div className="title">Finished</div>
        <div className={`text ${errorStr ? "error" : "success"}`}>
        {!errorStr ? "Data successfully saved to database." : `Error: ${errorStr}` }
        </div>
        <Button className="green" label="Process another" onClick={() => processAnother()} />
        <Button className="outlined" label="Close" onClick={() => closePopUp()} />
      </div>
    </div>
    <div className={`box ${isConfirmationOpen ? "display" : ""}`}>
        <div className="close" onClick={closePopUp}><div className="icon_close"></div></div>
        <div className="title">Clear documents</div>
        <div className="text">This action will clear all documents and is irreversible. Are you sure you want to clear all documents?</div>
        <Button className="red" label="Yes, clear now" onClick={() => deleteDocuments()} />
        <Button className="outlined" label="Close" onClick={() => closePopUp()} />
    </div>
    <div className={`box_background ${isPopUpOpen || isConfirmationOpen || visibleExtra!=null ? "display" : ""}`} onClick={closePopUp}></div>
    {errorStr && <div className="error_notification display"><div className="icon_cross"></div>{errorStr}</div>}
  </div>
  );
};

export default App;