import pdfMake from "pdfmake/build/pdfmake.js";
import pdfFonts from "pdfmake/build/vfs_fonts.js";
import fs from "node:fs";
import path from "node:path";
import { getDateAndTime } from '../date/date_utils.mjs';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const convertImageToBase64URL = (filename, imageType = 'png') => {
    try {
      const buffer = fs.readFileSync(filename);
      const base64String = Buffer.from(buffer).toString('base64');
      return `data:image/${imageType};base64,${base64String}`;
    } catch (error) {
      throw new Error(`file ${filename} no exist`);
    }
}

function setupFonts() {
    const fontFiles = [
        'Montserrat-Black.ttf', 'Montserrat-BlackItalic.ttf',
        'Montserrat-Bold.ttf', 'Montserrat-BoldItalic.ttf',
        'Montserrat-ExtraBold.ttf', 'Montserrat-ExtraBoldItalic.ttf',
        'Montserrat-ExtraLight.ttf', 'Montserrat-ExtraLightItalic.ttf',
        'Montserrat-Italic.ttf', 'Montserrat-Light.ttf',
        'Montserrat-LightItalic.ttf', 'Montserrat-Medium.ttf',
        'Montserrat-MediumItalic.ttf', 'Montserrat-Regular.ttf',
        'Montserrat-SemiBold.ttf', 'Montserrat-SemiBoldItalic.ttf',
        'Montserrat-Thin.ttf', 'Montserrat-ThinItalic.ttf'
    ];
    fontFiles.forEach(font => {
        try {
            const fontPath = path.resolve('../api_server/src/assets/fonts', font);
            pdfMake.vfs[font] = fs.readFileSync(fontPath).toString('base64');
        } catch (error) {
            console.error(`Error loading font file ${font}:`, error);
            throw error; // Re-throw to handle it further up if necessary
        }
    });
}

setupFonts();

pdfMake.fonts = {
    Montserrat: {
        normal: 'Montserrat-Regular.ttf',
        bold: 'Montserrat-Bold.ttf',
        italics: 'Montserrat-Italic.ttf',
        bolditalics: 'Montserrat-BoldItalic.ttf'
    }
};

function getHeaderAndLogos({carrera = "Not specified", date = "Not specified"} = {}){
    return [
        {
            columns: [
                {
                    image: convertImageToBase64URL('../api_server/src/assets/tnm_logo.png'),
                    fit: [100, 100]
                },
                {
                    image: convertImageToBase64URL('../api_server/src/assets/itc.png'),
                    fit: [60, 100],
                    alignment: 'right'
                },
            ]
        },
        { text: 'INSTITUTO TECNOLÓGICO DE CUAUTLA', style: 'mainHeader' },
        { text: 'SISTEMA WEB DE MONITOREO EDUCATIVO ENFOCADO A ÍNDICES DE REPROBACIÓN Y DESERCIÓN ESCOLAR', style: 'header' },
        {
            stack : [
                {
                    text: [
                        'Información de todos los docentes de la carrera ', {text: `${carrera}`, decoration: 'underline'},
                        ' registrados en el sistema hasta ', {text: `${date}.`, decoration: 'underline'},
                    ]
                }
            ],
            style : 'text'
        },
        { text: '', margin: [0, 0, 0, 10] } 

    ];
}

function getNewTable() {
    return {
        table: {
            headerRows: 1,
            widths: ['5%', '35%', '35%', '15%', '10%'],
            body: [
                [
                    { text: 'No', style: 'tableHeader' },
                    { text: 'Nombre', style: 'tableHeader' },
                    { text: 'Correo', style: 'tableHeader' },
                    { text: 'Fecha', style: 'tableHeader' },
                    { text: 'Hora', style: 'tableHeader' }
                ]  // Initial header row
            ]
        },
        layout: {
            paddingLeft: function(i, node) { return 5; },
            paddingRight: function(i, node) { return 5; },
            paddingTop: function(i, node) { return 2; },
            paddingBottom: function(i, node) { return 2; },
            fillColor: function (rowIndex) { return rowIndex === 0 ? '#18316B' : null; }
        }
    };
}

const pdfStyles = {
    mainHeader: {fontSize: 12, bold: true, alignment: 'center', margin: [0, 10, 0, 10], font: 'Montserrat'},
    header: {fontSize: 12, bold: true, alignment: 'justify', margin: [0, 0, 0, 10], font: 'Montserrat'},
    tableHeader: {fontSize: 12, bold: true, color: '#FFFFFF', fillColor: '#18316B', alignment: 'center'},
    tableDataName: { fontSize: 10, alignment: 'left', font: 'Montserrat' },
    tableData: {fontSize: 10, alignment: 'center', font: 'Montserrat'},
    text: {fontSize: 12, alignment: 'left', margin: [0, 0, 0, 10], font: 'Montserrat'}
}

export async function exportTeachers(data, carrera){
    return new Promise(async (resolve, reject) => {
        const { fecha, hora } = await getDateAndTime();
        const career = carrera || "Not specified";
        const date = fecha || "Not specified";

        let content = [
            ...getHeaderAndLogos({carrera: career, date: date}),
            getNewTable()
        ];
        data.forEach((item, index) => {
            if (index % 15 === 0 && index !== 0) {
                content.push({ text: '', pageBreak: 'before' });
                content.push(...getHeaderAndLogos({carrera: career, date: date}));  
                content.push(getNewTable());
            }
            content[content.length - 1].table.body.push([
                { text: `${index + 1}`, style: 'tableData' },
                { text: item.nombre, style: 'tableData' },
                { text: item.correo, style: 'tableData' },
                { text: item.fechaRegistro, style: 'tableData' },
                { text: item.horaRegistro, style: 'tableData' }
            ]);
        });
        const docDefinition = {
            content: content,
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { text: `${currentPage.toString()}`, alignment: 'right', margin: [0, 0, 40, 0] }
                    ]
                };
            },
            styles: pdfStyles,
            defaultStyle: { font: 'Montserrat' }
        };
    
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer) => {
            resolve(buffer);
        });
    });
}