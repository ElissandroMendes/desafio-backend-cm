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

        console.log("parsedData: " + JSON.stringify(parsedData));

        let newProductData = {};
        for (const key in parsedData) {
            console.log("key: " + key);
            if (Object.hasOwnProperty.call(parsedData, key)) {
                newProductData[key] = parsedData[key];
            }
        }
        console.log("newProductData: " + JSON.stringify(newProductData));
        
        newProductData.id = id;
        newProductData.imagens = parsedData.files;
        delete newProductData.files;
        
        console.log("1 newProductData: " + JSON.stringify(newProductData));

        const productsObjects = await utils.getObjectsFromS3(s3, "produtos", 
            process.env.PRODUTOS_FILE_NAME);

        console.log("productsObjects: " + JSON.stringify(productsObjects));

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
            console.log("productsObjects Depois: " + JSON.stringify(productsObjects));
            await utils.saveToS3(s3, process.env.PRODUTOS_FILE_NAME, "produtos", productsObjects);
            callback(null, utils.buildResponse(...productUpdated));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};

