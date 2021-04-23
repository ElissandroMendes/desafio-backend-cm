require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.updateProdutosHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Product not found."}];
    const productUpdated = [200, {"message": "Product updated successfully."}];
    try {
        const parsedData = await parser.parse(event);
        const { id } = event.pathParameters;

        let newProductData = {};
        newProductData.id = id;
        newProductData.nome = parsedData.nome;
        newProductData.imagem = parsedData.files && parsedData.files.length ? 
            parsedData.files[0] : '';

        const productsObjects = await utils.getObjectsFromS3(s3, "produtos", 
            process.env.PRODUTOS_FILE_NAME);

        console.log("productsObjects: " + JSON.stringify(productsObjects));
        const productsList = productsObjects.produtos;

        let productFound = false;
        for (let idx = 0; idx < productsList.length; idx++) {
            let product = productsList[idx];
            productFound = productsList[idx].id == newProductData.id;
            if (productFound) {
                productsList[idx].nome = newProductData.nome;
                if (newProductData.imagem) {
                    productsList[idx].imagem = utils.uploadFileIntoS3(s3, newProductData.imagem);
                };
                break;
            };
        };

        if (productFound) {
            await utils.saveToS3(s3, process.env.PRODUTOS_FILE_NAME, "produtos", productsObjects);
            callback(null, utils.buildResponse(...productUpdated));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};

