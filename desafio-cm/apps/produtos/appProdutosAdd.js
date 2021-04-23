require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.addProdutosHandler = async (event, context, callback) => {
    try {
        let newProductsList = null;
        const {productData, isValid, message} = await parseAndValidateBody(event);
        if (isValid) {
            newProductsList = await addToProductsList(productData);
            if (newProductsList.id) {
                await utils.saveToS3(s3, process.env.PRODUTOS_FILE_NAME, "produtos", 
                    newProductsList.productsObject);
            } else {
                callback(null, utils.buildResponse(400, {"message": "There is a Product with the same description and brand."}));
            }
        } else {
            callback(null, utils.buildResponse(403, {message}));
        }
        callback(null, utils.buildResponse(200, {"message":`Product added successfully. ID: ${newProductsList.id}`}));
    } catch(error) {
        callback(null, utils.buildResponse(400, error.message));
    }
};

async function parseAndValidateBody(event) {
    let productData = {};
    let isValid = false;
    let message = [];

    try {
        const parsedData = await parser.parse(event);

        console.log("Parsed data: " + JSON.stringify(parsedData));
        
        productData.descricao = parsedData.descricao;
        productData.marca = parsedData.marca;
        productData.categorias = JSON.parse(parsedData.categorias);
        productData.precoVenda = Number(parsedData.precoVenda);
        productData.precoCusto = Number(parsedData.precoCusto);
        productData.imagens = parsedData.files;

        if (!productData.descricao) {
            message.push('Field DESCRICAO is mandatory.'); 
        };

        if (!productData.marca) {
            message.push('Field MARCA is mandatory.'); 
        };

        if (!productData.precoVenda) {
            message.push('A valid Field PRECO VENDA is mandatory.'); 
        };

        const invalidCategory = !productData.categorias || 
            ((typeof(productData.categorias) == 'object' && 'push' in productData.categorias) && !productData.categorias.length);
        if (invalidCategory) {
            message.push('Field CATEGORIA is mandatory.'); 
        } 
    } catch(err) {
        message.push(`Unable to parse Event body.\r\nError: ${err}`); 
    }

    isValid = message.length == 0;
    message = isValid ? 'OK' : message.join('\r\n');
    return {productData, isValid, message};
};

async function addToProductsList(productData) {
    let productsObject = await utils.getObjectsFromS3(s3, "produtos", process.env.PRODUTOS_FILE_NAME);
    console.log("productsObject: " + JSON.stringify(productsObject));
    let productsList = productsObject.produtos;
    console.log("productsList: " + JSON.stringify(productsList));

    let response = {"id": null, productsObject};
    if (canAddProductToList(productsList, productData)) {        
        productData.id = utils.getLastId(productsList) + 1;

        let imagens = [];
        await Promise.all(
            productData.imagens.map(async file => {
                imagens.push(await utils.uploadFileIntoS3(s3, file));
            })
        );

        productData.imagens = imagens;
        productsList.push(productData); 
        response.id = productData.id;
    }
    return response;
};

function canAddProductToList (productList, newProductData) {
    const productListOrdered = utils.sortArrayByKey(productList, 'marca');
    let duplicateInBrandsProductFound = false;
    for (let idx = 0; idx < productListOrdered.length; idx++) {
        const product = productListOrdered[idx];
        if (product.marca == newProductData.marca && product.descricao == newProductData.descricao) {
            duplicateInBrandsProductFound = true;
            break;
        };
    };
    return !duplicateInBrandsProductFound;
};
