require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.updateCategoriasHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Category not found."}];
    const brandUpdated = [200, {"message": "Category updated successfully."}];
    try {
        const parsedData = await parser.parse(event);
        const { id } = event.pathParameters;

        let newCategoryData = {};
        newCategoryData.id = id;
        newCategoryData.nome = parsedData.nome;
        newCategoryData.imagem = parsedData.files && parsedData.files.length ? 
            parsedData.files[0] : '';

        const categoriesObjects = await utils.getObjectsFromS3(s3, "categorias", 
            process.env.MARCAS_FILE_NAME);

        console.log("categoriesObjects: " + JSON.stringify(categoriesObjects));
        const categoriesList = categoriesObjects.categorias;

        let brandFound = false;
        for (let idx = 0; idx < categoriesList.length; idx++) {
            let brand = categoriesList[idx];
            brandFound = categoriesList[idx].id == newCategoryData.id;
            if (brandFound) {
                categoriesList[idx].nome = newCategoryData.nome;
                if (newCategoryData.imagem) {
                    categoriesList[idx].imagem = utils.uploadFileIntoS3(s3, newCategoryData.imagem);
                };
                break;
            };
        };

        if (brandFound) {
            await utils.saveToS3(s3, process.env.MARCAS_FILE_NAME, "categorias", categoriesObjects);
            callback(null, utils.buildResponse(...brandUpdated));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};

