require('dotenv/config');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.deleteProdutosHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Product not found."}];
    const productDeleted = [200, {"message": "Product removed successfully."}];
    try {
        const { id } = event.pathParameters;
        const productsObjects = await utils.getObjectsFromS3(s3, "produtos", process.env.PRODUTOS_FILE_NAME);
        
        const numItems = productsObjects.produtos.length;
        utils.removeItemById(productsObjects.produtos, id);
        
        if (productsObjects.produtos.length < numItems) {
            await utils.saveToS3(s3, process.env.PRODUTOS_FILE_NAME, "produtos", productsObjects);
            callback(null, utils.buildResponse(...productDeleted));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};
