import "./cuon-utils.js";
import {OBJDoc} from './OBJDoc.js'


export class Model {
  program = null;
  model = {};
  g_objDoc = null; // The information of OBJ file
  g_drawingInfo = null; // The information for drawing 3D model
  fileName=null
  gl=null
  scale=null
  reverse=null
  constructor(gl,fileName,scale,reverse) {
    if (!gl) {
      console.log("Failed to get the rendering context for WebGL");
      return;
    }
    this.gl=gl
    this.fileName=fileName
    this.scale=scale
    this.reverse = reverse

  }

  async readOBJFile() {
    const {fileName, gl, model, scale, reverse} =this
    // var request = new XMLHttpRequest();

    // request.onreadystatechange = () =>{
    //   if (request.readyState === 4 && request.status !== 404) {
    //    this.onReadOBJFile(
    //       request.responseText,
    //       fileName,
    //       gl,
    //       model,
    //       scale,
    //       reverse
    //     );
    //   }
    // };
    // request.open("GET", fileName, true); // Create a request to acquire the file
    // request.send(); // Send the request
    const response = await axios(fileName);
    let data = response
// console.log("response",response);
// console.log("data",data);
   await this.onReadOBJFile(
      data.data,
          fileName,
          gl,
          model,
          scale,
          reverse
        );
  }
  // OBJ File has been read
  onReadOBJFile(fileString, fileName, gl, o, scale, reverse) {
    const objDoc = new OBJDoc(fileName); // Create a OBJDoc object
    const result = objDoc.parse(fileString, scale, reverse); // Parse the file
    if (!result) {
      this.g_objDoc = null;
      this.g_drawingInfo = null;
      console.log("OBJ file parsing error.");
      return;
    }
    this.g_objDoc = objDoc;
    this.getDrawInfo()
    // console.log(objDoc);
  }
  getDrawInfo(){
    if (this.g_objDoc != null && this.g_objDoc.isMTLComplete()){ // OBJ and all MTLs are available
     this.g_drawingInfo  = this.g_objDoc.getDrawingInfo();
    //  console.log(new Date().getTime());
    //  console.log(this.g_drawingInfo);
    }
    // if (!g_drawingInfo) return;   // モデルを読み込み済みか判定
  
  }
}
