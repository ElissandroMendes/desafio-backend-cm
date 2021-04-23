require('dotenv/config');

const { v4: uuidv4 } = require('uuid');

exports.sortArrayByKey = (arr, key) => arr.sort((p, q) => p[key] > q[key] ? 1 : -1 );
exports.findItemByKey = (arr, key, value) => arr.find(item => item[key] == value);
exports.buildResponse = (statusCode, messageData) => {
  const typeOfMessagedata = typeof messageData == 'string'; 
  const messageBody = typeOfMessagedata == 'string' ? 
    JSON.stringify({"message": messageData}) : JSON.stringify(messageData);
  return {
    "statusCode": statusCode,
    "headers": {
      "Content-Type": "application/json"
    },
    "isBase64Encoded": false,
    "body": messageBody
  };
};

exports.buildQueryParams = (s3Key, modelName, whereClause) => {
  let sql = `Select * From s3object[*].${modelName}[*] model ${whereClause ? ' where ' + whereClause : '' };`;
  return {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      ExpressionType: 'SQL',
      Expression: sql,
      InputSerialization: {
          JSON: {
              Type: 'DOCUMENT',
          }
      },
      OutputSerialization: {
          JSON: {
              RecordDelimiter: ','
          }
      }
  }
};

exports.saveToS3 = async (S3, S3Key, modelName, brandData) => {
  brandData.marcas = exports.sortArrayByKey(brandData[modelName], 'nome');

  let params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: S3Key,
      Body: JSON.stringify(brandData)
  }

  let result = await S3.putObject(params).promise();
  return result;
};

exports.getDataFromS3 = async (s3, s3Key, modelName, whereClause) => {
  const queryParams = exports.buildQueryParams(s3Key, modelName, whereClause);

  return new Promise((resolve, reject) => {
      s3.selectObjectContent(queryParams, (err, data) => {
          if (err) { 
              //Caso o arquivo (Key) não exista, retorna vazio.
              resolve([]); 
          }

          if (!data) {
              reject('Empty data object');
          } else {
              const records = []
              data.Payload.on('data', (event) => {
                  if (event.Records) {
                      records.push(event.Records.Payload);
                  }
              })
              .on('error', (err) => {
                  reject(err);
              })
              .on('end', () => {
                  let dataString = Buffer.concat(records).toString('utf8');
                  dataString = dataString.replace(/\,$/, '');
                  dataString = `[${dataString}]`;
                  try {
                      const data = JSON.parse(dataString);
                      resolve(data);
                  } catch (e) {
                      reject(new Error(`Unable to convert S3 data to JSON object. S3 Select Query: ${params.Expression}`));
                  }
              });    
          }
      });
  })
};
exports.getQueryParam = (paramObj, paramName, defaultValue) => {
  return (paramObj && paramObj[paramName]) ? 
    paramObj[paramName] : defaultValue;
  
};

exports.applyPagination = (data, offset, limit) => {
  return data.slice(offset, Number(offset) + Number(limit));
};

exports.getLastId = (modelList) => { 
  let maxId = 0; 
  if (modelList.length) {
    const obj = modelList.reduce((p, q) => p.id > q.id ? p : q);
    maxId = obj.id;
  }
  return maxId;
};

exports.removeItemById = (items, id) => {
  console.log("Len: " + items.length);
  for (let idx = 0; idx < items.length; idx++) {
    console.log("ID: " + items[idx].id);
    if (items[idx].id == id) {
      console.log("removendo item...");
      items.splice(idx, 1);
      break;
    }    
  }
  return items;
};
exports.getObjectsFromS3 = async (S3, modelName, S3Key) => {
  const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: S3Key
  };
  let modelObjects = {};
  modelObjects[modelName] = [];
  try {
      let objects = await S3.getObject(params).promise();
      modelObjects = JSON.parse(objects.Body.toString());
  } catch (err) {
      console.log(`Object ${S3Key} does not exist.`);
  }
  return modelObjects;
}

/**
 * Rotimes to Upload Imagem to S3.
 */
exports.uploadFileIntoS3 = async (s3, file) => {
  const ext = exports.getFileExtension(file);
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `imagem-${uuidv4()}.${ext}`,
    Body: file.content
  };

  try {
      console.log(`Uploading: ${file.filename}`);
      await s3.upload(params).promise();
      return exports.makeFileURL(params.Key);
  } catch (err) {
      console.error(`Error uploading image to S3.\r\n${err}`);
      throw err;
  }
};

exports.getFileExtension = file => {
  let extension = '';
  const contentType = file.contentType;
  if (contentType) {
      switch (contentType) {
          case "image/jpeg":
              extension = 'jpeg';
              break;
          case "image/png":
              extension = 'png';
              break;
      }
  } else {
      throw new Error(`Missing "contentType".`);
  }
  
  if (!extension) throw new Error(`Unsupported content type "${contentType}".`);

  return extension;
};

exports.makeFileURL = (fileName) => {
  return `https://${process.env.AWS_BUCKET_NAME}.s3-${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};
