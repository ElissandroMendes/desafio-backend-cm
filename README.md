# Desafio Backend Developer Casa Magalhães

Esse projeto é a resposta do desafio técnico para desenvolvedor backend, cuja inteção é construir uma API REST que rode baseada em AWS Lambda functions, as especificações estão descritas no link abaixo:

[Especificações do desafio](https://gist.github.com/andersao/664a9a45ee550beb0b4905a5236e86d5)

## Arquitetura

A API REST foi estruturada com base nas linguagens e ferramentas resumidas abaixo:

- [AWS API Gateway](https://aws.amazon.com/pt/api-gateway/)
- [AWS Serverless Application Model](https://aws.amazon.com/pt/serverless/sam/)
- [AWS S3](https://aws.amazon.com/pt/s3/)
- [AWS Toolkit for Visual Studio Code](https://aws.amazon.com/pt/visualstudiocode/)
- [Node.js 14.x](https://nodejs.org/en/)

A API está implantada no API Gateway na URL abaixo:

- [API REST URL](https://u150v2ccc6.execute-api.sa-east-1.amazonaws.com/Prod/)

Para implementação dos endpoints da API no API Gateway usamos o SAM Template, que consta nesse repositório.

A API contém os seguinte endpoints/métodos:

- /categorias:
  - get:
  - post:
- /categorias/{id}:

  - get:
  - put:
  - delete:
  - patch:

- /marcas:
  - get:
  - post:
- /marcas/{id}:

  - get:
  - put:
  - delete:
  - patch:

- /produtos:
  - get:
  - post:
- /produtos/{id}:
  - get:
  - put:
  - delete:
  - patch:

Os métodos GET aceitam paginação com base nas seguintes query string (opcionais):

- **offset** - Quantidade de registros a avançar da resposta - padrão: 0;
- **limit** - Quantidade de registros a devolver - padrão: 100;

Para os recursos **Marcas** e **Categorias** o método GET aceita as seguintes querystring: **nome**;

Para **Produtos** o método GET aceita as seguintes querystring: **marca, categoria, descricao**;

O filtro por descrição pode ser parcial, buscando a string passada em qualquer posição da descrição do produto.

Os métodos POST, por permitirem envio de imagens, devem ter como Content-type: **multipart/form-data**.

Para armazenamento dos recursos: Marca, Categoria e Produto, assim como suas imagens anexadas, optou-se por usar arquivo JSON gravados no S3.

## Pré Requisitos para uso do repositório:

Para desenvolver a solução usamos o VSCode.
Abaixo seguem algumas orientações e softwares que usamos para o projeto:

- Ter uma conta na AWS.
  - Por questão de boas práticas não devemos usar nossa conta root;
- Instalar o AWS CLI:
  - AWS CLI - [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- Instalar o AWS SAM CLI:
  - SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- Configurar suas credencias:

```bash
$> aws configure
```

- Instalar o AWS Toolkit for Visual Studio Code - [Install Toolkit](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/setup-toolkit.html)
- Node.js - [Install Node.js 14](https://nodejs.org/en/)
- Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

O Docker é útil para invocação local das Lambda functions.

Após a instalação dos pré-requisitos acima, clonar o repositório e dentro da pasta do projeto, executar:

```bash
sam build
sam deploy --guided
```

O primeiro comand irá executar um build da aplicação.
O segundo fará o deploy da aplicação para a AWS.

Para esse primeiro deploy é interessante usarmos a opção --guided.

Teremos uma série de perguntas:

- **Stack Name**: Nome da stack a criad ano CloudFormation. Deve ser único para sua conta e região, uma sugestão seria o nome do projeto.
- **AWS Region**: Região da AWS para onde seu projeto dever ser enviado.
- **Confirm changes before deploy**: Se sim, serão exibidas as alterações antes de serem gravadas.
- **Allow SAM CLI IAM role creation**: Informa se permite que os papéis necessários sejam automaticamente criado.
- **Save arguments to samconfig.toml**: Se sim, suas escolhas serão gravadas em um arquivo de configuração sendo usado nos demais deploy, bastando executar **sam deploy**.

No repositório temos o arquivo:

- **DesafioBackendCM-app-Prod-swagger-apigateway.yaml**
  Esse arquivo foi gerado a partir do Insomnia e contém requests de exemplo de chamadas à API para todos os endpoints disponibilizados. Para usa-lo basta instalar o [Insomnia](https://insomnia.rest/download) e realizar a importação. Será criada uma workspace e nela conterá dos os endpoints.
