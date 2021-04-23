require('dotenv/config');

const utils = require('./../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.deleteMarcasHandler = async (event, context, callback) => {
    const notFound = [404, {"message": "Brand not found."}];
    const brandDeleted = [200, {"message": "Brand removed successfully."}];
    try {
        const { id } = event.pathParameters;
        const brandsObjects = await utils.getObjectsFromS3(s3, "marcas", process.env.MARCAS_FILE_NAME);
        console.log("brandsObjects: " + JSON.stringify(brandsObjects));
        
        const numItems = brandsObjects.marcas.length;
        utils.removeItemById(brandsObjects.marcas, id);
        console.log("brandsObjects Depois: " + JSON.stringify(brandsObjects));
        
        if (brandsObjects.marcas.length < numItems) {
            await utils.saveToS3(s3, process.env.MARCAS_FILE_NAME, "marcas", brandsObjects);
            callback(null, utils.buildResponse(...brandDeleted));
        } else {
            callback(null, utils.buildResponse(...notFound));
        }
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};
