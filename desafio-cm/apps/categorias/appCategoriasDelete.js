require('dotenv/config');

const utils = require('./../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.deleteCategoriasHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Category not found."}];
    const categoryDeleted = [200, {"message": "Category removed successfully."}];
    try {
        const { id } = event.pathParameters;
        const categoriesObjects = await utils.getObjectsFromS3(s3, "categorias", process.env.CATEGORIAS_FILE_NAME);
        
        const numItems = categoriesObjects.categorias.length;
        utils.removeItemById(categoriesObjects.categorias, id);
        
        if (categoriesObjects.categorias.length < numItems) {
            await utils.saveToS3(s3, process.env.CATEGORIAS_FILE_NAME, "categorias", categoriesObjects);
            callback(null, utils.buildResponse(...categoryDeleted));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};
