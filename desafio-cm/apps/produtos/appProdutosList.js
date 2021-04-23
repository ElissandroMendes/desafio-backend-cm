require('dotenv/config');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.listProdutosHandler = async (event, context, callback) => {
    try {
        const { id } = event.pathParameters || {};

        const queryParam = event.queryStringParameters;
        const offset = utils.getQueryParam(queryParam, 'offset', 0); 
        const limit = utils.getQueryParam(queryParam, 'limit', 100); 
        let brand = utils.getQueryParam(queryParam, 'marca', ''); 
        let category = utils.getQueryParam(queryParam, 'categoria', ''); 
        const description = utils.getQueryParam(queryParam, 'descricao', ''); 
        
        let brands = await utils.getObjectsFromS3(s3, "marcas", process.env.MARCAS_FILE_NAME);
        brands = brands.marcas;

        let categories = await utils.getObjectsFromS3(s3, "categorias", process.env.CATEGORIAS_FILE_NAME);
        categories = categories.categorias;  

        //Encontra os ID da categoria e marca
        if (brand) {
            brand = brands.find(b => b.nome == brand);
        }
        console.log("Brand: " + JSON.stringify(brand));
        
        if (category) {
            category = categories.find(c => c.nome == category);
        }
        
        let products = await utils.getObjectsFromS3(s3, 'produtos', process.env.PRODUTOS_FILE_NAME);
        products = products.produtos;

        products = utils.applyPagination(products, offset, limit);

        //Aplica filtro por marca, categoria e descrição
        let productsFiltered = products.filter((product => {
            const okId = id ? product.id == id : true;
            const okBrand = brand ? product.marca == brand.id : true;
            const okCategory = category ? product.categorias.includes(category.id) : true;
            const okDescription = description ? product.descricao.indexOf(description) > -1 : true;
            return okId && okBrand && okCategory && okDescription;
        }));
        
        // Troca os ID's pelos objetos de marcas e categorias na listagem.
        productsFiltered.map(product => {
            product.marca = brands.find(brand => brand.id == product.marca);
            let categoryList = product.categorias.map(idCategory => {
                return categories.find(category => category.id == idCategory);
            });
            product.categorias = categoryList;
        });
        callback(null, utils.buildResponse(200, {"produtos": productsFiltered}));
    } catch (err) {
        callback(null, utils.buildResponse(400, err.message));
    };
};
