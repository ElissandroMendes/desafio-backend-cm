require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.addMarcasHandler = async (event, context, callback) => {
    try {
        let id = 1;
        let newBrandsList = null;

        const {brandData, isValid, message} = await parseAndValidateBody(event);
        if (isValid) {
            newBrandsList = await addToBrandsList(brandData);
            id = newBrandsList.id;
            await utils.saveToS3(s3, process.env.MARCAS_FILE_NAME, "marcas", 
                newBrandsList.brandsObject);
        } else {
            callback(null, utils.buildResponse(403, message));
        }
        callback(null, utils.buildResponse(200, {"message":`Brand added successfully. ID: ${id}`}));
    } catch(error) {
        callback(null, utils.buildResponse(400, error.message));
    }
};

async function parseAndValidateBody(event) {
    let brandData = {};
    let isValid = false;
    let message = '';

    try {
        const parsedData = await parser.parse(event);
        brandData.nome = parsedData.nome;
        brandData.imagem = parsedData.files[0];
        isValid = brandData.nome != undefined && !!brandData.nome;
        message = !isValid ? 'Field NOME is mandatory.' : 'OK'; 
    } catch(err) {
        message = `Unable to parse Event body.\r\nError: ${err}`; 
    }
    
    return {brandData, isValid, message};
};

async function getBrandsObjectFromS3() {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: process.env.MARCAS_FILE_NAME
    };

    let brandsObject = {"marcas": []};
    try {
        let objects = await s3.getObject(params).promise();
        brandsObject = JSON.parse(objects.Body.toString());
    } catch (err) {
        console.log('Object does not exist.');
    }
    return brandsObject;
};

async function addToBrandsList(brandData) {
    let brandsObject = await getBrandsObjectFromS3();
    let brandsList = brandsObject.marcas;
    if (!utils.findItemByKey(brandsList, 'nome', brandData.nome)) {        
        // await Promise.all(
        //     data.files.map(async file => {
        //         console.log(`Uploading imagem ${file.filename}`)
        //         await uploadFileIntoS3(file);
        //     })
        // );
        const imageNameS3 = await utils.uploadFileIntoS3(s3, brandData.imagem);

        brandData.id = utils.getLastId(brandsList) + 1;
        brandData.imagem = imageNameS3;
        brandsList.push(brandData); 
    }
    return {"id": brandData.id, brandsObject};
};
