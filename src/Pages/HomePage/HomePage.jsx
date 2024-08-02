import React, { useState } from 'react';
import './HomePage.css';
import logo from '../../assets/images/logo-01.png';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faCircleDown } from '@fortawesome/free-solid-svg-icons';
import { TailSpin } from 'react-loader-spinner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import ParticlesBg from 'particles-bg';
import Select from 'react-select';

const HomePage = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedHeaders, setSelectedHeaders] = useState([]);

  const allHeaders = [
    { label: 'Name', value: 'firstName' },
    { label: 'Age', value: 'age' },
    { label: 'Gender', value: 'gender' },
    { label: 'Email', value: 'email' },
    { label: 'Mobile Number', value: 'mobile_number' },
    { label: 'Date of Registration', value: 'createdAt' },
    { label: 'Patient ID', value: 'patientId' },
  ];

  const handleButtonClick = () => {
    navigate('./register');
  };

  const resetModalState = () => {
    setFromDate(null);
    setToDate(null);
    setSelectedHeaders([]);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    resetModalState();
  };

  const fetchRegistrations = async (fileFormat) => {
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates.");
      return;
    }

    if (selectedHeaders.length === 0) {
      toast.error("Please select at least one header.");
      return;
    }

    if (fileFormat === 'csv') {
      setIsLoadingExcel(true);
    } else {
      setIsLoadingPDF(true);
    }

    try {
      const formattedFromDate = format(fromDate, 'yyyy/MM/dd');
      const formattedToDate = format(toDate, 'yyyy/MM/dd');
      const response = await axios.post('https://giostar.onrender.com/registration/getAll', {
        fromDate: formattedFromDate,
        toDate: formattedToDate
      });

      const data = response.data.data;

      if (!data || data.length === 0) {
        toast.error(response.data.message || 'Empty Registrations');
      } else {
        const filteredData = data.map(({ _id, isRegistered, updatedAt, __v, address, city, state, pincode, reason, typeOfVisit, middleName, lastname, ...rest }) => rest);
        setRegistrations(filteredData);
        if (fileFormat === 'csv') {
          exportToCSV(filteredData);
        } else if (fileFormat === 'pdf') {
          exportToPDF(filteredData);
        }
        setModalIsOpen(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error fetching registrations';
      toast.error(errorMessage);
      console.error('Error fetching registrations:', error);
    } finally {
      setIsLoadingExcel(false);
      setIsLoadingPDF(false);
      setFromDate(null);
      setToDate(null);
      setSelectedHeaders([null]);
    }
  };

  const exportToCSV = (data) => {
    const headers = selectedHeaders.map(header => ({
      label: header.label,
      key: header.value
    }));

    const worksheetData = data.map(item => {
      const row = {};
      headers.forEach(header => {
        if (header.key === 'createdAt') {
          row[header.label] = format(new Date(item[header.key]), 'dd-MM-yyyy');
        } else {
          row[header.label] = item[header.key];
        }
      });
      return row;
    });

    worksheetData.unshift(headers.reduce((acc, header) => {
      acc[header.label] = header.label;
      return acc;
    }, {}));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    worksheet['!cols'] = headers.map(() => ({ wpx: 150 }));

    XLSX.writeFile(workbook, 'registrations.xlsx');
  };

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    const headers = selectedHeaders.map(header => header.label);
    const rows = data.map(item => selectedHeaders.map(header => {
      if (header.value === 'createdAt') {
        return format(new Date(item[header.value]), 'dd-MM-yyyy');
      } else {
        return item[header.value];
      }
    }));

    doc.autoTable({
      head: [headers],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save('registrations.pdf');
  };

  return (
    <div className="home-page">
      <ParticlesBg type="square" bg={true} />
      <div className="content">
        <img src={logo} alt="Hospital Logo" className="logo" />
        <h4 className="title">Effortless Patient Registration</h4>
        <p className="subtitle">"From Registration to Care: Enhancing the Patient Journey"</p>
        <button className="register-btn" onClick={handleButtonClick}>Register</button>
        <button className='export-btn' onClick={() => setModalIsOpen(true)}>
          {(isLoadingExcel || isLoadingPDF) ? (
            <div className="spinner-container">
              Loading <TailSpin color="#fff" height={24} width={24} />
            </div>
          ) : (
            <><FontAwesomeIcon icon={faCircleDown} /> Export Registrations</>
          )}
        </button>
      </div>
      <div className="background-img"></div>

      <div id="myModal" className="modal" style={{ display: modalIsOpen ? 'block' : 'none' }}>
        <div className="modal-content">
          <span className="close" onClick={closeModal}>&times;</span>
          <h2>Select Date Range</h2>
          <div className="date-picker-container">
            <label className="date-picker-label">From:</label>
            <FontAwesomeIcon icon={faCalendarDays} />
            <DatePicker
              selected={fromDate}
              onChange={date => setFromDate(date)}
              placeholderText="Select from date"
              dateFormat="yyyy/MM/dd"
            />
            <label className="date-picker-label">To:</label>
            <FontAwesomeIcon icon={faCalendarDays} />
            <DatePicker
              selected={toDate}
              onChange={date => setToDate(date)}
              placeholderText="Select to date"
              dateFormat="yyyy/MM/dd"
            />
          </div>
          <div className="custom-headers">
            <h2>Select Headers</h2>
            <Select
              isMulti
              options={allHeaders}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={setSelectedHeaders}
              value={selectedHeaders}
            />
          </div>
          <div className="export-buttons">
            <button onClick={() => fetchRegistrations('csv')} disabled={isLoadingExcel} className='download-btn'>
              {isLoadingExcel ? (
                <div className="spinner-container">
                  Loading <TailSpin color="#fff" height={24} width={24} />
                </div>
              ) : (
                "Download as Excel"
              )}
            </button>
            <button onClick={() => fetchRegistrations('pdf')} disabled={isLoadingPDF} className='download-btn'>
              {isLoadingPDF ? (
                <div className="spinner-container">
                  Loading <TailSpin color="#fff" height={24} width={24} />
                </div>
              ) : (
                "Download as PDF"
              )}
            </button>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default HomePage;
