require('dotenv/config');

const parser = require('lambda-multipart-parser');

const utils = require('./../utils/utils');

var AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.addCategoriasHandler = async (event, context, callback) => {
    try {
        let id = 1;
        let newCategoriesList = null;

        const {categoryData, isValid, message} = await parseAndValidateBody(event);
        if (isValid) {
            newCategoriesList = await addToCategoriesList(categoryData);
            id = newCategoriesList.id;
            await utils.saveToS3(s3, process.env.MARCAS_FILE_NAME, "categorias", 
                newCategoriesList.categoriesObject);
        } else {
            callback(null, utils.buildResponse(403, message));
        }
        callback(null, utils.buildResponse(200, {"message":`Category added successfully. ID: ${id}`}));
    } catch(error) {
        callback(null, utils.buildResponse(400, error.message));
    }
};

async function parseAndValidateBody(event) {
    let categoryData = {};
    let isValid = false;
    let message = '';

    try {
        const parsedData = await parser.parse(event);
        categoryData.nome = parsedData.nome;
        categoryData.imagem = parsedData.files[0];
        isValid = categoryData.nome != undefined && !!categoryData.nome;
        message = !isValid ? 'Field NOME is mandatory.' : 'OK'; 
    } catch(err) {
        message = `Unable to parse Event body.\r\nError: ${err}`; 
    }
    
    return {categoryData, isValid, message};
};

async function getCategoriesObjectFromS3() {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: process.env.MARCAS_FILE_NAME
    };

    let categoriesObject = {"categorias": []};
    try {
        let objects = await s3.getObject(params).promise();
        categoriesObject = JSON.parse(objects.Body.toString());
    } catch (err) {
        console.log('Object does not exist.');
    }
    return categoriesObject;
};

async function addToCategoriesList(categoryData) {
    let categoriesObject = await getCategoriesObjectFromS3();
    let categoriesList = categoriesObject.categorias;
    if (!utils.findItemByKey(categoriesList, 'nome', categoryData.nome)) {        
        // await Promise.all(
        //     data.files.map(async file => {
        //         console.log(`Uploading imagem ${file.filename}`)
        //         await uploadFileIntoS3(file);
        //     })
        // );
        const imageNameS3 = await utils.uploadFileIntoS3(s3, categoryData.imagem);

        categoryData.id = utils.getLastId(categoriesList) + 1;
        categoryData.imagem = imageNameS3;
        categoriesList.push(categoryData); 
    }
    return {"id": categoryData.id, categoriesObject};
};
