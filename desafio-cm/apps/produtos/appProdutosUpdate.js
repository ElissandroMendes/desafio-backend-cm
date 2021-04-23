require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.updateMarcasHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Brand not found."}];
    const brandUpdated = [200, {"message": "Brand updated successfully."}];
    try {
        const parsedData = await parser.parse(event);
        const { id } = event.pathParameters;

        let newBrandData = {};
        newBrandData.id = id;
        newBrandData.nome = parsedData.nome;
        newBrandData.imagem = parsedData.files && parsedData.files.length ? 
            parsedData.files[0] : '';

        const brandsObjects = await utils.getObjectsFromS3(s3, "marcas", 
            process.env.MARCAS_FILE_NAME);

        console.log("brandsObjects: " + JSON.stringify(brandsObjects));
        const brandsList = brandsObjects.marcas;

        let brandFound = false;
        for (let idx = 0; idx < brandsList.length; idx++) {
            let brand = brandsList[idx];
            brandFound = brandsList[idx].id == newBrandData.id;
            if (brandFound) {
                brandsList[idx].nome = newBrandData.nome;
                if (newBrandData.imagem) {
                    brandsList[idx].imagem = utils.uploadFileIntoS3(s3, newBrandData.imagem);
                };
                break;
            };
        };

        if (brandFound) {
            await utils.saveToS3(s3, process.env.MARCAS_FILE_NAME, "marcas", brandsObjects);
            callback(null, utils.buildResponse(...brandUpdated));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};

