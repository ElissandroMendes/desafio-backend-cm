require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.addProdutosHandler = async (event, context, callback) => {
    try {
        let id = 1;
        let newProductsList = null;

        const {productData, isValid, message} = await parseAndValidateBody(event);
        if (isValid) {
            newProductsList = await addToProductsList(productData);
            id = newProductsList.id;
            await utils.saveToS3(s3, process.env.PRODUTOS_FILE_NAME, "produtos", 
                newProductsList.productsObject);
        } else {
            callback(null, utils.buildResponse(403, message));
        }
        callback(null, utils.buildResponse(200, {"message":`Product added successfully. ID: ${id}`}));
    } catch(error) {
        callback(null, utils.buildResponse(400, error.message));
    }
};

async function parseAndValidateBody(event) {
    let productData = {};
    let isValid = false;
    let message = '';

    try {
        const parsedData = await parser.parse(event);
        productData.nome = parsedData.nome;
        productData.imagem = parsedData.files[0];
        isValid = productData.nome != undefined && !!productData.nome;
        message = !isValid ? 'Field NOME is mandatory.' : 'OK'; 
    } catch(err) {
        message = `Unable to parse Event body.\r\nError: ${err}`; 
    }
    
    return {productData, isValid, message};
};

async function getProductsObjectFromS3() {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: process.env.MARCAS_FILE_NAME
    };

    let productsObject = {"produtos": []};
    try {
        let objects = await s3.getObject(params).promise();
        productsObject = JSON.parse(objects.Body.toString());
    } catch (err) {
        console.log('Object does not exist.');
    }
    return brandsObject;
};

async function addToProductsList(productData) {
    let productsObject = await getProductsObjectFromS3();
    let productsList = productsObject.produtos;
    if (!utils.findItemByKey(productsList, 'nome', productData.nome)) {        
        // await Promise.all(
        //     data.files.map(async file => {
        //         console.log(`Uploading imagem ${file.filename}`)
        //         await uploadFileIntoS3(file);
        //     })
        // );
        const imageNameS3 = await utils.uploadFileIntoS3(s3, productData.imagem);

        productData.id = utils.getLastId(productsList) + 1;
        productData.imagem = imageNameS3;
        productsList.push(productData); 
    }
    return {"id": productData.id, productsObject};
};
