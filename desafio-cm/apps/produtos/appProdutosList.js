require('dotenv/config');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.listProdutosHandler = async (event, context, callback) => {
    try {
        const queryParam = event.queryStringParameters;
        const nome = utils.getQueryParam(queryParam, 'nome', ''); 
        const whereClause = nome ? `model.nome='${nome}'` : '';
        
        let data = await utils.getDataFromS3(s3, process.env.PRODUTOS_FILE_NAME, 'produtos', whereClause);
        const offset = utils.getQueryParam(queryParam, 'offset', 0); 
        const limit = utils.getQueryParam(queryParam, 'limit', 100); 
        
        data = utils.applyPagination(data, offset, limit);

        callback(null, utils.buildResponse(200, {data}));
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};
