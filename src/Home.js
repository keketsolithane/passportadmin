import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

// Import the coat of arms image
import lesothoCoatOfArms from "./lesotho-coat-of-arms.png";

export default function Home() {
  const [applications, setApplications] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const printRef = useRef(null);
  const [imageCache, setImageCache] = useState({});
  const [coatOfArmsImage, setCoatOfArmsImage] = useState(null);

 useEffect(() => {
  fetchData();
  loadCoatOfArmsImage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: appsData, error: appsError } = await supabase
        .from("passport_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (appsError) throw appsError;
      setApplications(appsData || []);

      const { data: renewData, error: renewError } = await supabase
        .from("renewals")
        .select("*")
        .order("created_at", { ascending: false });
      if (renewError) throw renewError;
      setRenewals(renewData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Error fetching data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCoatOfArmsImage = async () => {
    try {
      // Convert the imported image to base64 for PDF use
      const response = await fetch(lesothoCoatOfArms);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCoatOfArmsImage(reader.result);
          resolve(reader.result);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading coat of arms image:', error);
      // Fallback: create a simple version if image loading fails
      createFallbackCoatOfArms();
    }
  };

  const createFallbackCoatOfArms = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;

    // Simple fallback design
    ctx.fillStyle = '#006600';
    ctx.fillRect(0, 0, 200, 200);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KHOTSO', 100, 80);
    ctx.fillText('PULA', 100, 110);
    ctx.fillText('NALA', 100, 140);
    
    const dataUrl = canvas.toDataURL('image/png');
    setCoatOfArmsImage(dataUrl);
    return dataUrl;
  };

  const handleStatusChange = async (id, newStatus, table) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      if (table === "passport_applications") {
        setApplications(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      } else {
        setRenewals(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      }

      alert("Status updated successfully!");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Error updating status: " + err.message);
    }
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("File not found");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Error downloading file: " + error.message);
    }
  };

  const downloadImage = async (url) => {
    if (imageCache[url]) return imageCache[url];
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImageCache(prev => ({ ...prev, [url]: objectUrl }));
      return objectUrl;
    } catch (error) {
      console.error("Error downloading image:", error);
      return url;
    }
  };

  const addWatermarkToPage = (doc) => {
    if (!coatOfArmsImage) return;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add watermark with low opacity
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    
    // Add watermark in multiple positions for better coverage
    const positions = [
      { x: pageWidth/2 - 40, y: pageHeight/2 - 40, width: 80, height: 80 },
      { x: pageWidth/4 - 30, y: pageHeight/4 - 30, width: 60, height: 60 },
      { x: pageWidth*3/4 - 30, y: pageHeight*3/4 - 30, width: 60, height: 60 },
      { x: pageWidth/4 - 30, y: pageHeight*3/4 - 30, width: 60, height: 60 },
      { x: pageWidth*3/4 - 30, y: pageHeight/4 - 30, width: 60, height: 60 }
    ];

    positions.forEach(pos => {
      doc.addImage(coatOfArmsImage, 'PNG', pos.x, pos.y, pos.width, pos.height);
    });

    doc.setGState(new doc.GState({ opacity: 1 }));
  };

  const addPassportNumberToPage = (doc, passportNumber, pageNumber, totalPages) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add passport number at the bottom of each page
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    // Passport number on left bottom
    doc.text(`Passport No: ${passportNumber}`, 15, pageHeight - 15);
    
    // Page number on right bottom
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 25, pageHeight - 15, { align: 'right' });
  };

  const createBlankPageWithWatermark = (doc, passportNumber, pageNumber, totalPages) => {
    // Set light green background
    doc.setFillColor(240, 248, 240);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
    
    // Add coat of arms watermark
    addWatermarkToPage(doc);
    
    // Add text watermarks
    doc.setFontSize(40);
    doc.setTextColor(0, 100, 0);
    doc.setGState(new doc.GState({ opacity: 0.3 }));
    
    doc.text('LESOTHO PASSPORT', 30, 50, { angle: 45 });
    doc.text('LESOTHO PASSPORT', 80, 100, { angle: 45 });
    doc.text('LESOTHO PASSPORT', 130, 150, { angle: 45 });
    doc.text('LESOTHO PASSPORT', 180, 200, { angle: 45 });
    doc.text('LESOTHO PASSPORT', 30, 250, { angle: 45 });
    
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    // Add passport number and page number
    addPassportNumberToPage(doc, passportNumber, pageNumber, totalPages);
  };

  const viewDetails = async (item, type) => {
    if (item.photo_url) await downloadImage(item.photo_url);
    if (item.signature_url) await downloadImage(item.signature_url);
    
    setSelectedItem(item);
    setSelectedType(type);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedType("");
  };

  if (loading) return <div className="loading-container"><div className="loading-text">Loading data...</div></div>;

  const printPassportPDF = async () => {
    if (!printRef.current || !selectedItem) return;

    const photoUrl = selectedItem.photo_url ? await downloadImage(selectedItem.photo_url) : null;
    const signatureUrl = selectedItem.signature_url ? await downloadImage(selectedItem.signature_url) : null;

    const doc = new jsPDF("p", "mm", "a4");
    const passportNumber = `LS-${selectedItem.id}`;

    const captureDiv = async (div) => {
      const canvas = await html2canvas(div, { 
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      return canvas.toDataURL("image/png");
    };

    // Cover Page (Dark Green)
    const coverDiv = printRef.current.querySelector(".passport-cover");
    const coverImg = await captureDiv(coverDiv);
    
    const imgProps = doc.getImageProperties(coverImg);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    doc.addImage(coverImg, "PNG", 0, 0, pdfWidth, pdfHeight);
    // Add passport number to cover page
    addPassportNumberToPage(doc, passportNumber, 1, 0); // Total pages will be updated later

    // First Page (Light Green)
    doc.addPage();
    const firstPageDiv = printRef.current.querySelector(".passport-first-page");
    if (photoUrl) {
      const img = firstPageDiv.querySelector('img');
      if (img) img.src = photoUrl;
    }
    if (signatureUrl) {
      const signatureImg = firstPageDiv.querySelector('.signature-container img');
      if (signatureImg) signatureImg.src = signatureUrl;
    }
    
    const firstPageImg = await captureDiv(firstPageDiv);
    doc.addImage(firstPageImg, "PNG", 0, 0, pdfWidth, pdfHeight);
    addWatermarkToPage(doc);
    addPassportNumberToPage(doc, passportNumber, 2, 0);

    // Second Page (Light Green)
    doc.addPage();
    const secondPageDiv = printRef.current.querySelector(".passport-second-page");
    const secondPageImg = await captureDiv(secondPageDiv);
    doc.addImage(secondPageImg, "PNG", 0, 0, pdfWidth, pdfHeight);
    addWatermarkToPage(doc);
    addPassportNumberToPage(doc, passportNumber, 3, 0);

    // Add blank pages based on passport type
    const totalPages = selectedItem.passport_type === "32 pages" ? 32 : 64;
    const remainingPages = totalPages - 4; // 4 pages already added (cover, first, second, last)
    
    // Add blank pages with watermarks and passport numbers
    for (let i = 0; i < remainingPages; i++) {
      doc.addPage();
      const currentPageNumber = 4 + i;
      createBlankPageWithWatermark(doc, passportNumber, currentPageNumber, totalPages);
    }

    // Last Page (Dark Green)
    doc.addPage();
    const lastPageDiv = printRef.current.querySelector(".passport-last-page");
    const lastPageImg = await captureDiv(lastPageDiv);
    doc.addImage(lastPageImg, "PNG", 0, 0, pdfWidth, pdfHeight);
    addPassportNumberToPage(doc, passportNumber, totalPages, totalPages);

    // Now update all pages with correct total page count
    const finalTotalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= finalTotalPages; i++) {
      doc.setPage(i);
      // Clear existing footer
      doc.setFillColor(255, 255, 255);
      doc.rect(0, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth(), 20, 'F');
      
      // Re-add passport number with correct total pages
      addPassportNumberToPage(doc, passportNumber, i, finalTotalPages);
    }

    doc.save(`Lesotho_Passport_${passportNumber}.pdf`);
  };

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1>Admin Dashboard</h1>

        <h2>Passport Applications</h2>
        {applications.length === 0 ? <p>No applications found.</p> : (
          <table className="applications-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>ID Number</th>
                <th>Passport Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(item => (
                <tr key={item.id}>
                  <td>LS-{item.id}</td>
                  <td>{item.full_name}</td>
                  <td>{item.email}</td>
                  <td>{item.id_number}</td>
                  <td>{item.passport_type}</td>
                  <td>{item.status || "Pending"}</td>
                  <td>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "—"}</td>
                  <td>
                    <button onClick={() => viewDetails(item, "application")} className="btn-view">View</button>
                    <button onClick={() => handleStatusChange(item.id, "Approved", "passport_applications")} className="btn-approve">Approve</button>
                    <button onClick={() => handleStatusChange(item.id, "Declined", "passport_applications")} className="btn-decline">Decline</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Passport Renewals</h2>
        {renewals.length === 0 ? <p>No renewals found.</p> : (
          <table className="applications-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Name</th>
                <th>Surname</th>
                <th>Passport Number</th>
                <th>District</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map(item => (
                <tr key={item.id}>
                  <td>RE-{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.surname}</td>
                  <td>{item.passport_number}</td>
                  <td>{item.district}</td>
                  <td>{item.status || "Pending"}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
                  <td>
                    <button onClick={() => viewDetails(item, "renewal")} className="btn-view">View</button>
                    <button onClick={() => handleStatusChange(item.id, "Approved", "renewals")} className="btn-approve">Approve</button>
                    <button onClick={() => handleStatusChange(item.id, "Declined", "renewals")} className="btn-decline">Decline</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selectedItem && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{selectedType === "application" ? "Application Details" : "Renewal Details"}</h2>
                <button onClick={closeModal} className="close-btn">×</button>
              </div>

              <div className="modal-body">
                <div ref={printRef} style={{ position: 'absolute', left: '-9999px' }}>
                  
                  <div className="passport-cover" style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    background: 'linear-gradient(to bottom, #004d00, #006400)',
                    color: 'white', 
                    textAlign: 'center',
                    padding: '50px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    <img 
                      src={lesothoCoatOfArms} 
                      alt="Coat of Arms" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.2,
                        zIndex: 1
                      }}
                    />
                    <div style={{ 
                      width: '120px', 
                      height: '120px',
                      marginBottom: '30px',
                      border: '3px solid gold',
                      borderRadius: '60px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      background: '#004d00',
                      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'gold' }}>KINGDOM</div>
                      <div style={{ fontSize: '14px', color: 'white' }}>OF</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'gold' }}>LESOTHO</div>
                    </div>
                    <h1 style={{ fontSize: '36px', marginTop: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', color: 'white', position: 'relative', zIndex: 2 }}>KINGDOM OF LESOTHO</h1>
                    <h2 style={{ fontSize: '28px', marginTop: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', color: 'gold', position: 'relative', zIndex: 2 }}>PASSPORT</h2>
                    <p style={{ fontSize: '18px', marginTop: '100px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', color: 'white', position: 'relative', zIndex: 2 }}>Official Document</p>
                  </div>

                  <div className="passport-first-page" style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    padding: '20px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    background: '#f0f8f0',
                    position: 'relative'
                  }}>
                    <img 
                      src={lesothoCoatOfArms} 
                      alt="Coat of Arms" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.1,
                        zIndex: 1
                      }}
                    />
                    <div style={{ width: '40%', padding: '20px', position: 'relative', zIndex: 2 }}>
                      {selectedItem.photo_url && (
                        <img 
                          src={imageCache[selectedItem.photo_url] || selectedItem.photo_url} 
                          alt="Passport" 
                          crossOrigin="anonymous" 
                          style={{ 
                            width: '120px', 
                            height: '150px',
                            border: '2px solid #004d00',
                            objectFit: 'cover'
                          }} 
                        />
                      )}
                      <div style={{ marginTop: '20px', borderTop: '1px solid #004d00', paddingTop: '10px' }}>
                        <p style={{ fontSize: '12px', color: '#004d00' }}><strong>Signature of Bearer:</strong></p>
                        <div className="signature-container" style={{ height: '50px', border: '1px dashed #004d00', marginTop: '5px' }}>
                          {selectedItem.signature_url ? (
                            <img 
                              src={imageCache[selectedItem.signature_url] || selectedItem.signature_url} 
                              alt="Signature" 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                          ) : (
                            <span style={{ color: '#666', fontSize: '10px' }}>Signature will appear here</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ width: '60%', padding: '20px', position: 'relative', zIndex: 2 }}>
                      <h3 style={{ borderBottom: '2px solid #004d00', paddingBottom: '10px', color: '#004d00' }}>PERSONAL DETAILS</h3>
                      <div style={{ lineHeight: '1.8', color: '#004d00' }}>
                        <p><strong>Surname:</strong> {selectedItem.surname || selectedItem.full_name?.split(' ')[0]}</p>
                        <p><strong>Given Names:</strong> {selectedItem.full_name}</p>
                        <p><strong>Nationality:</strong> {selectedItem.nationality || 'Mosotho'}</p>
                        <p><strong>Date of Birth:</strong> {selectedItem.dob}</p>
                        <p><strong>Place of Birth:</strong> {selectedItem.birth_place}</p>
                        <p><strong>Sex:</strong> {selectedItem.sex || 'Not specified'}</p>
                        <p><strong>ID Number:</strong> {selectedItem.id_number}</p>
                        <p><strong>District:</strong> {selectedItem.district}</p>
                        {/* Head Chief field removed from PDF */}
                      </div>
                    </div>
                  </div>

                  <div className="passport-second-page" style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    padding: '30px',
                    boxSizing: 'border-box',
                    background: '#f0f8f0',
                    position: 'relative'
                  }}>
                    <img 
                      src={lesothoCoatOfArms} 
                      alt="Coat of Arms" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.1,
                        zIndex: 1
                      }}
                    />
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <h3 style={{ borderBottom: '2px solid #004d00', paddingBottom: '10px', color: '#004d00' }}>ADDITIONAL INFORMATION</h3>
                      <div style={{ lineHeight: '1.8', marginBottom: '30px', color: '#004d00' }}>
                        <p><strong>Passport Type:</strong> {selectedItem.passport_type}</p>
                        <p><strong>Passport No:</strong> LS-{selectedItem.id}</p>
                        <p><strong>Date of Issue:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Date of Expiry:</strong> {new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toLocaleDateString()}</p>
                        <p><strong>Authority:</strong> Government of Lesotho</p>
                      </div>

                      {(selectedItem.guardian_name || selectedItem.guardian_id) && (
                        <div style={{ marginTop: '30px' }}>
                          <h4 style={{ borderBottom: '1px solid #004d00', paddingBottom: '5px', color: '#004d00' }}>GUARDIAN INFORMATION</h4>
                          <p><strong>Guardian Name:</strong> {selectedItem.guardian_name}</p>
                          <p><strong>Guardian ID:</strong> {selectedItem.guardian_id}</p>
                        </div>
                      )}

                      <div style={{ marginTop: '30px' }}>
                        <h4 style={{ borderBottom: '1px solid #004d00', paddingBottom: '5px', color: '#004d00' }}>EMERGENCY CONTACT</h4>
                        <p><strong>Contact Person:</strong> _________________________</p>
                        <p><strong>Phone Number:</strong> _________________________</p>
                        <p><strong>Relationship:</strong> _________________________</p>
                      </div>
                    </div>
                  </div>

                  <div className="passport-last-page" style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    textAlign: 'center', 
                    padding: '50px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(to bottom, #004d00, #006400)',
                    position: 'relative'
                  }}>
                    <img 
                      src={lesothoCoatOfArms} 
                      alt="Coat of Arms" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.2,
                        zIndex: 1
                      }}
                    />
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <h2 style={{ color: 'white', marginBottom: '30px' }}>IMPORTANT NOTICE</h2>
                      <div style={{ textAlign: 'left', marginBottom: '40px', color: 'white' }}>
                        <p>• This passport is the property of the Government of Lesotho</p>
                        <p>• It must be surrendered upon demand by authorized officials</p>
                        <p>• Report loss or theft immediately to local authorities</p>
                        <p>• Keep your passport in a secure place at all times</p>
                      </div>
                      <div style={{ marginTop: '50px', color: 'white' }}>
                        <p>Issued by:</p>
                        <p><strong>Ministry of Home Affairs</strong></p>
                        <p>Kingdom of Lesotho</p>
                        <p>{new Date().toLocaleDateString()}</p>
                      </div>
                      <div style={{ marginTop: '50px', borderTop: '2px solid white', paddingTop: '20px', width: '80%', margin: '50px auto 0' }}>
                        <p style={{ fontSize: '12px', color: '#ccc' }}>LS-{selectedItem.id} | Printed on: {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  {selectedItem.photo_url && (
                    <img 
                      src={selectedItem.photo_url} 
                      alt="Passport" 
                      style={{ 
                        width: '150px', 
                        float: 'right', 
                        margin: '10px',
                        border: '2px solid #000'
                      }} 
                    />
                  )}
                  
                  <h3>Personal Information</h3>
                  <div className="details-list">
                    <p><strong>Full Name:</strong> {selectedItem.full_name}</p>
                    <p><strong>ID Number:</strong> {selectedItem.id_number}</p>
                    <p><strong>Nationality:</strong> {selectedItem.nationality}</p>
                    <p><strong>Date of Birth:</strong> {selectedItem.dob}</p>
                    <p><strong>Place of Birth:</strong> {selectedItem.birth_place}</p>
                    <p><strong>District:</strong> {selectedItem.district}</p>
                    <p><strong>Head Chief:</strong> {selectedItem.head_chief}</p>
                    <p><strong>Passport Type:</strong> {selectedItem.passport_type}</p>
                    {selectedItem.guardian_name && (
                      <p><strong>Guardian Name:</strong> {selectedItem.guardian_name}</p>
                    )}
                    {selectedItem.guardian_id && (
                      <p><strong>Guardian ID:</strong> {selectedItem.guardian_id}</p>
                    )}
                  </div>

                  {selectedItem.docs_url && (
                    <div style={{ marginTop: '20px' }}>
                      <h4>Supporting Documents</h4>
                      <button 
                        onClick={() => downloadFile(selectedItem.docs_url, `documents_${selectedItem.id}`)}
                        className="download-btn"
                      >
                        Download Documents
                      </button>
                    </div>
                  )}

                  {selectedItem.signature_url && (
                    <div style={{ marginTop: '20px' }}>
                      <h4>Signature</h4>
                      <img 
                        src={selectedItem.signature_url} 
                        alt="Signature" 
                        style={{ width: '200px', border: '1px solid #ccc' }} 
                      />
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button onClick={printPassportPDF} className="btn-print">Generate Passport PDF</button>
                  <button onClick={closeModal} className="btn-close">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};