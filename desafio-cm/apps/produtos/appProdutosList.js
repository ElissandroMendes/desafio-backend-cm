require('dotenv/config');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.listProdutosHandler = async (event, context, callback) => {
    try {
        const queryParam = event.queryStringParameters;
        const nome = utils.getQueryParam(queryParam, 'nome', ''); 
        const whereClause = nome ? `model.nome='${nome}'` : '';
        
        let products = await utils.getDataFromS3(s3, process.env.PRODUTOS_FILE_NAME, 'produtos', whereClause);
        const offset = utils.getQueryParam(queryParam, 'offset', 0); 
        const limit = utils.getQueryParam(queryParam, 'limit', 100); 
        
        products = utils.applyPagination(products, offset, limit);

        let brands = await utils.getObjectsFromS3(s3, "marcas", process.env.MARCAS_FILE_NAME);
        brands = brands.marcas;
        console.log("Brands: " + JSON.stringify(brands));
        let categories = await utils.getObjectsFromS3(s3, "categorias", process.env.CATEGORIAS_FILE_NAME);
        categories = categories.categorias;        
        console.log("categories: " + JSON.stringify(categories));
        products.map(product => {
            product.marca = brands.find(brand => brand.id == product.marca);
            let categoryList = product.categorias.map(idCategory => {
                return categories.find(category => category.id == idCategory);
            });
            console.log("categoryList: " + JSON.stringify(categoryList));
            product.categorias = categoryList;
        });

        callback(null, utils.buildResponse(200, {"produtos": products}));
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};
