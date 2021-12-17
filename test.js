const zipFolder = require('zip-folder')

zipFolder("./src", "./src.zip", (result) => {
    console.log(result)
})