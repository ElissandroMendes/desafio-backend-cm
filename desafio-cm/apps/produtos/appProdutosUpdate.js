require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.updateProdutosHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Product not found."}];
    const productUpdated = [200, {"message": "Product updated successfully."}];
    try {
        let newProductData = {};
        
        const parsedData = await parser.parse(event);
        const { id } = event.pathParameters;

        Object.assign(newProductData, parsedData);
        newProductData.id = id;
        newProductData.categorias = JSON.parse(parsedData.categorias);
        newProductData.imagens = parsedData.files;
        delete newProductData.files;
        console.log("newProductData: " + JSON.stringify(newProductData));

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
                if (newProductData.imagens) {
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

