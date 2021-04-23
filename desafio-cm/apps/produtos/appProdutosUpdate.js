require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.updateProdutosHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Product not found."}];
    const productUpdated = [200, {"message": "Product updated successfully."}];
    try {
        const { id } = event.pathParameters || {};
        const parsedData = await parser.parse(event);

        let newProductData = {};
        for (const key in parsedData) {
            if (Object.hasOwnProperty.call(parsedData, key)) {
                newProductData[key] = parsedData[key];
            }
        }

        newProductData.id = id;
        newProductData.imagens = parsedData.files;
        //Trocamos o atributo files por imagens para manter a consistencia.
        //Então removemos o atributo files.
        delete newProductData.files;

        const productsObjects = await utils.getObjectsFromS3(s3, "produtos", 
            process.env.PRODUTOS_FILE_NAME);
        const productsList = productsObjects.produtos;

        let productFound = false;
        for (let idx = 0; idx < productsList.length; idx++) {
            let product = productsList[idx];
            productFound = productsList[idx].id == newProductData.id;
            if (productFound) {
                Object.assign(product, newProductData);
                if (newProductData.imagens && newProductData.imagens.length) {
                    let imagens = [];
                    await Promise.all(
                        newProductData.imagens.map(async file => {
                            imagens.push(await utils.uploadFileIntoS3(s3, file));
                        })
                    );            
                    productsList[idx].imagens = imagens;
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

