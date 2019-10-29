// var glm = require('glm-js');

// https://humbletim.github.io/glm-js/
import {Model} from'./lib/objParse.js'
import {flushPromises} from'./lib/flushPromises.js'



let SCREEN_WIDTH = 1024;
let SCREEN_HEIGHT = 768;
let NUM_LOD = 3;

let TERRAIN_SIZE		=		256
let TERRAIN_HEIGHT		=		100
let TERRAIN_OBJECT_SIZE	=		((TERRAIN_SIZE-1)*2)
let PRIMITIVE_RESTART_INDEX =		0xFFFFFFFF

let gl
export class Demo {
  Transform = {
    // mat4,mat4,mat4,mat4,vec4
    ModelViewMatrix: null, // modelview matrix of the transformation
    ProjectionMatrix: null, // projection matrix of the transformation
    InfProjectionMatrix: null, // infinite projection matrix for the sky box
    MVPMatrix: null, // modelview-projection matrix
    Viewport: null // viewport dimensions
  };

  Camera = {
    // vec3 ,vec3
    position: null, // camera position
    rotation: null // camera rotation
  };

  DrawCommand = {
    // GLenum,uint,uint
    prim_type: null, // primitive type
    indexOffset: null, // offset into the index buffer
    indexCount: null // number of indices
  };

  InstanceData = {
    // vec3
    position: null // position of the instance
  };

  TreeVertexStruct = {
    // GLfloat,GLbyte,GLubyte
    position: new Array(3), // vertex position
    normal: new Array(4), // vertex normal
    texcoord: new Array(4) // vertex texture coordinate
  };

  CullMode = {
    PASS_THROUGH: 0, // pass through, no culling
    INSTANCE_CLOUD_REDUCTION: 1, // instance cloud reduction
    HI_Z_OCCLUSION_CULL: 2 // Hi-Z occlusion culling
  };
} /* class demo */

export let demo = new Demo();
export class MountainsDemo {
  // Camera
  camera = demo.Camera; // camera data
  //  Transform
  transform = demo.Transform; // transformation data
  //  GLuint
  transformUB; // uniform buffer for the transformation
  //  GLuint
  dummyVS; // dummy vertex shader
  //  GLuint
  terrainVA; // terrain vertex array
  //  GLuint
  terrainIB; // terrain index buffer
  //  GLuint
  terrainVB; // terrain vertex buffer

  //  GLuint
  terrainVS; // terrain vertex shader
  //  GLuint
  terrainFS; // terrain fragment shader
  //  GLuint
  terrainPO; // terrain program object

  //  DrawCommand
  terrainDraw = new Array(NUM_LOD); // terrain draw command

  //  GLuint
  heightmap; // height map texture
  //  GLuint
  terrainTex; // terrain texture
  //  GLuint
  detailTex; // terrain detail texture

  //  GLuint
  skyboxGS; // sky box geometry shader
  //  GLuint
  skyboxFS; // sky box fragment shader
  //  GLuint
  skyboxPO; // sky box program object

  //  GLuint
  skyboxTex; // sky box texture array

  //  GLuint
  treeVA = new Array(NUM_LOD); // tree vertex array
  //  GLuint
  treeIB; // tree index buffer
  //  GLuint
  treeVB; // tree vertex buffer
  //  GLuint
  treePB; // tree instance position buffer

  //  GLuint
  cullVA; // vertex array used for culling
  //  GLuint
  instanceBO = new Array(NUM_LOD); // instance buffer objects
  //  uint
  instanceCount; // number of tree instances

  //  GLuint
  treeVS; // tree vertex shader
  //  GLuint
  treeFS; // tree fragment shader
  //  GLuint
  treePO; // tree program object

  //  GLuint
  treeTex; // tree texture

  //  GLuint
  cullVS; // cull vertex shader
  //  GLuint
  cullGS; // cull geometry shader
  //  GLuint
  cullPO; // cull program object
  //  unit
  subIndexVS = new Array(3); // cull vertex shader subroutine indices
  //  unit
  subIndexGS = new Array(2); // cull geometry shader subroutine indices
  //  CullMode
  cullMode; // cull mode
  //  bool
  LODMode; // LOD mode

  //  GLuint
  cullQuery = new Array(NUM_LOD); // query object used for the culling

  //  DrawCommand
  treeDraw = new Array(NUM_LOD); // tree draw command

  //  vec3
  treeExtent; // extents of the tree's bounding box
  //  int
  visibleTrees = new Array(NUM_LOD); // number of visible trees
  //  int
  visibleBlocks; // number of visible terrain elements

  //  int
  treeTriCount = new Array(NUM_LOD); // number of triangles in the tree model
  //  int
  terrainTriCount; // number of triangles in the terrain

  //  int
  drawCallCount; // number of draw calls
  //  GLuint
  colorTex; // color texture
  //  GLuint
  depthTex; // depth texture
  //  GLuint
  framebuffer; // framebuffer object

  //  GLuint
  hizGS; // Hi-Z map construction geometry shader
  //  GLuint
  hizFS; // Hi-Z map construction fragment shader
  //  GLuint
  hizPO; // Hi-Z map construction program object

  //  GLuint
  postGS; // post processing geometry shader
  //  GLuint
  postFS; // post processing fragment shader
  //  GLuint
  postPO; // post processing program object

  //  int
  LOD; // LOD of the depth buffer texture
  //  GLuint
  depthFS; // depth texture fragment shader
  //  GLuint
  depthPO; // depth texture program object
  //  bool
  showDepthTex; // enable showing of depth buffer texture

  //  bool
  showLODColor; // enable dynamic LOD visualization

  //  mat4

  //  infPerspective(float fovy, float aspect, float znear);
  infPerspective(fovy, aspect, znear) {
    // float
    const range = Math.tan(glm.radians(fovy / 2)) * znear;
    const left = -range * aspect;
    const right = range * aspect;
    const bottom = -range;
    const top = range;
    const epsilon = 2.4e-7;

    //  mat4
    let result = glm.mat4(0);
    result[0][0] = (2 * znear) / (right - left);
    result[1][1] = (2 * znear) / (top - bottom);
    result[2][2] = epsilon - 1;
    result[2][3] = -1;
    result[3][2] = (epsilon - 2) * znear;
    return result;
  }
  generateTerrain() {

	console.log("> Generating terrain..." );

	// create empty index buffer
	this.terrainIB=gl.createBuffer();
	const indexBufferRowSize = TERRAIN_SIZE*2 + 1;
    const indexBufferSize = indexBufferRowSize * (TERRAIN_SIZE-1) * Uint32Array.BYTES_PER_ELEMENT;

    const indexArr = [];
    
    for ( let i=0; i<TERRAIN_SIZE-1; i++) {
            for ( let j=0; j<TERRAIN_SIZE; j++) {
                indexArr[i*indexBufferRowSize+j*2+0] = (i+1)*TERRAIN_SIZE+j;
                indexArr[i*indexBufferRowSize+j*2+1] = (i+0)*TERRAIN_SIZE+j;
            }
            indexArr[i*indexBufferRowSize+TERRAIN_SIZE*2] = PRIMITIVE_RESTART_INDEX;
        }

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.terrainIB);
	// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrBuffer, gl.STATIC_DRAW,0,indexBufferSize);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexArr),gl.STATIC_DRAW);
    // gl.getBufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, arrBuffer,0,  );
    // map index buffer and fill with data
    // https://github.com/KhronosGroup/WebGL/issues/541
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/getBufferSubData

    // const address=[]
    // const TERRAIN_SIZE=256
    // const indexBufferRowSize=TERRAIN_SIZE*2 + 1
    // for ( i=0; i<TERRAIN_SIZE-1; i++) {
    //         for ( j=0; j<TERRAIN_SIZE; j++) {
    //             address[i*indexBufferRowSize+j*2+0] = (i+1)*TERRAIN_SIZE+j;
    //             address[i*indexBufferRowSize+j*2+1] = (i+0)*TERRAIN_SIZE+j;
    //         }
    //         address[i*indexBufferRowSize+TERRAIN_SIZE*2] = 0xFFFFFFFF;
    //     }



	// gl.unMapBuffer(gl.ELEMENT_ARRAY_BUFFER);

	// create empty vertex buffer
	this.terrainVB=gl.createBuffer();
    const vertexBufferSize = TERRAIN_SIZE * TERRAIN_SIZE * Float32Array.BYTES_PER_ELEMENT * 2;
     
     const vertexAddr=[]
     for ( let i=0; i<TERRAIN_SIZE; i++) {
        for ( let j=0; j<TERRAIN_SIZE; j++) {
         vertexAddr[(i*TERRAIN_SIZE+j)*2+0] = i*2;
         vertexAddr[(i*TERRAIN_SIZE+j)*2+1] = j*2;
        }
    }
     
	gl.bindBuffer(gl.ARRAY_BUFFER, this.terrainVB);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexAddr), gl.STATIC_DRAW);

	// map vertex buffer and fill with data
//  vertexAddr = gl.MapBufferRange(gl.ARRAY_BUFFER, 0, vertexBufferSize,
// 					gl.MAP_WRITE_BIT | gl.MAP_INVALIDATE_BUFFER_BIT | gl.MAP_UNSYNCHRONIZED_BIT );


	// glUnmapBuffer(gl.ARRAY_BUFFER);

	// create and setup vertex array
    this.terrainVA=gl.createVertexArray()
	gl.bindVertexArray(this.terrainVA);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.terrainIB);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.terrainVB);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, gl.FALSE, Float32Array.BYTES_PER_ELEMENT * 2,0);
	gl.bindVertexArray(this.terrainVA); // 0 是什么????

	this.terrainDraw.prim_type = gl.TRIANGLE_STRIP;
	this.terrainDraw.indexOffset = 0;
	this.terrainDraw.indexCount = (TERRAIN_SIZE*2 + 1)*(TERRAIN_SIZE-1);

	this.terrainTriCount = (TERRAIN_SIZE-1)*(TERRAIN_SIZE-1)*2;
}
  // void generateSkybox();
 async loadMeshData() {

    let indexOffset;
    let vertexOffset;
  
    console.log("> Loading meshes...");
    // load models
  
    demo.treeFoliageObj=[
      new Model(gl,'./modules/tree_foliage_lod0.obj'),
      new Model(gl,'./modules/tree_foliage_lod1.obj'),
      new Model(gl,'./modules/tree_foliage_lod2.obj'),
     ]
    demo.treeTrunkObj=[
      new Model(gl,'./modules/tree_trunk_lod0.obj'),
      new Model(gl,'./modules/tree_trunk_lod1.obj'),
      new Model(gl,'./modules/tree_trunk_lod2.obj'),
     ]
    await demo.treeFoliageObj[0].readOBJFile()
    await demo.treeFoliageObj[1].readOBJFile()
    await demo.treeFoliageObj[2].readOBJFile()
    await demo.treeTrunkObj[0].readOBJFile()
    await demo.treeTrunkObj[1].readOBJFile()
    await demo.treeTrunkObj[2].readOBJFile()
    console.log(new Date().getTime());
    console.log(demo);
  
    console.log("> Uploading mesh data to GPU...");
    await flushPromises()
    console.log(new Date().getTime());
   
    // create empty index buffer
    this.treeIB=gl.createBuffer()
    let indexBufferSize = 0;

    // demo.treeFoliageObj[0].g_drawingInfo.indices     Uint16Array 索引数组
    // demo.treeFoliageObj[0].g_drawingInfo.normals    Float32Array 法线数组  
    // demo.treeFoliageObj[0].g_drawingInfo.vertices   Float32Array 顶点数组 
    for (let i=0; i<NUM_LOD; i++) {

      indexBufferSize += ( demo.treeFoliageObj[i].g_drawingInfo.indices.length + demo.treeTrunkObj[i].g_drawingInfo.indices.length ) * Uint16Array.BYTES_PER_ELEMENT;
    }
     
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.treeIB);


  indexOffset = 0;
    vertexOffset = 0;
  const indexArr=[]
    for (let i=0; i<NUM_LOD; i++) {

      this.treeDraw[i] = {
        // GLenum,uint,uint
        prim_type: null, // primitive type
        indexOffset: null, // offset into the index buffer
        indexCount: null // number of indices
      };
      this.treeDraw[i].prim_type = gl.TRIANGLES;
      this.treeDraw[i].indexOffset = indexOffset;
      this.treeDraw[i].indexCount = demo.treeFoliageObj[i].g_drawingInfo.indices.length + demo.treeTrunkObj[i].g_drawingInfo.indices.length;
      this.treeTriCount[i] = this.treeDraw[i].indexCount / 3;
      // this.uploadIndexData(address, indexOffset, vertexOffset, treeFoliageObj[i]);
      		//  index buffer 
		//  遍历 树叶模型的 索引数组，将值赋给 indexbuff
// 	uploadIndexData(uint* address, uint& indexOffset, uint& vertexOffset, WaveFrontObj& obj) {
 
	for (let j=0; j<demo.treeFoliageObj[i].g_drawingInfo.indices.length; j++) {
   
		indexArr[indexOffset+j] = demo.treeFoliageObj[i].g_drawingInfo.indices[j] + vertexOffset;


  }
  indexOffset += demo.treeFoliageObj[i].g_drawingInfo.indices.length;
	vertexOffset += demo.treeFoliageObj[i].g_drawingInfo.vertices.length;
	for (let j=0; j<demo.treeTrunkObj[i].g_drawingInfo.indices.length; j++) {
		indexArr[indexOffset+j] = demo.treeTrunkObj[i].g_drawingInfo.indices[j] + vertexOffset;

  }
  indexOffset += demo.treeTrunkObj[i].g_drawingInfo.indices.length;
	vertexOffset += demo.treeTrunkObj[i].g_drawingInfo.vertices.length;

// }
      // this.uploadIndexData(address, indexOffset, vertexOffset, treeTrunkObj[i]);
      // cerr << "  Tree LOD: " << i << " " << this.treeTriCount[i] << " triangles" << endl;
    }
console.log(indexArr);
  
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArr), gl.STATIC_DRAW);
  
    // // map index buffer and fill with data
    // uint *address = (uint*)glMapBufferRange(GL_ELEMENT_ARRAY_BUFFER, 0, indexBufferSize,
    //               GL_MAP_WRITE_BIT | GL_MAP_INVALIDATE_BUFFER_BIT | GL_MAP_UNSYNCHRONIZED_BIT);
  
  
  
    // glUnmapBuffer(GL_ELEMENT_ARRAY_BUFFER);
  
    // create empty vertex buffers
    let vertexCount = 0;
    for (let i=0; i<NUM_LOD; i++) {
      vertexCount += demo.treeFoliageObj[i].g_drawingInfo.vertices.length + demo.treeTrunkObj[i].vertices.length
    }
     
    // uint vertexBufferSize = vertexCount * sizeof(TreeVertexStruct);
    this.treeVB=gl.createBuffer();
    gl.bindBuffer(GL_ARRAY_BUFFER, this.treeVB);
    glBufferData(GL_ARRAY_BUFFER, vertexBufferSize, GL_STATIC_DRAW);
    // TreeVertexStruct* vertexAddr = (TreeVertexStruct*)glMapBufferRange(GL_ARRAY_BUFFER, 0, vertexBufferSize,
    //               GL_MAP_WRITE_BIT | GL_MAP_INVALIDATE_BUFFER_BIT | GL_MAP_UNSYNCHRONIZED_BIT);
    this.treeExtent = glm.vec3( 0.0, 0.0, 0.0 );
  
    let vertexOffset = 0;
    for (let i=0; i<NUM_LOD; i++) {
      // this->uploadVertexData(vertexAddr, vertexOffset, treeFoliageObj[i], 0);
      // uploadVertexData(TreeVertexStruct* vertexAddr, uint& vertexOffset, WaveFrontObj& obj, uint layer) {
        // for (uint i=0; i<obj.vertex.size(); i++) {
        //   // vertex position
        //   vertexAddr[vertexOffset+i].position[0] = obj.vertex[i].x;
        //   vertexAddr[vertexOffset+i].position[1] = obj.vertex[i].y;
        //   vertexAddr[vertexOffset+i].position[2] = obj.vertex[i].z;
        //   // vertex normal
        //   vertexAddr[vertexOffset+i].normal[0] = SNORM(obj.normal[i].x);
        //   vertexAddr[vertexOffset+i].normal[1] = SNORM(obj.normal[i].y);
        //   vertexAddr[vertexOffset+i].normal[2] = SNORM(obj.normal[i].z);
        //   // texture coordinate
        //   vertexAddr[vertexOffset+i].texcoord[0] = NORM(obj.texcoord[i].u);
        //   vertexAddr[vertexOffset+i].texcoord[1] = NORM(obj.texcoord[i].v);
        //   vertexAddr[vertexOffset+i].texcoord[2] = layer; // texture array layer
        //   // update tree extents
        //   if ( fabs( obj.vertex[i].x ) > this->treeExtent.x ) this->treeExtent.x = fabs( obj.vertex[i].x );
        //   if ( fabs( obj.vertex[i].y ) > this->treeExtent.y ) this->treeExtent.y = fabs( obj.vertex[i].y );
        //   if ( fabs( obj.vertex[i].z ) > this->treeExtent.z ) this->treeExtent.z = fabs( obj.vertex[i].z );
        // }

        // vertexOffset += demo.treeFoliageObj[i].g_drawingInfo.vertices.length;
      // }

      // this->uploadVertexData(vertexAddr, vertexOffset, treeTrunkObj[i], 255);
    }
  
    // glUnmapBuffer(GL_ARRAY_BUFFER);
  
    // // setup vertex array for the tree
    // glGenVertexArrays(3, this->treeVA);
    // for (int i=0; i<NUM_LOD; i++) {
    //   glBindVertexArray(this->treeVA[i]);
    //   glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, this->treeIB);
    //   glBindBuffer(GL_ARRAY_BUFFER, this->treeVB);
    //   glEnableVertexAttribArray(0);
    //   glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(TreeVertexStruct), (void*)offsetof(TreeVertexStruct,position));
    //   glEnableVertexAttribArray(1);
    //   glVertexAttribPointer(1, 3, GL_BYTE, GL_TRUE, sizeof(TreeVertexStruct), (void*)offsetof(TreeVertexStruct,normal));
    //   glEnableVertexAttribArray(2);
    //   glVertexAttribPointer(2, 3, GL_UNSIGNED_BYTE, GL_TRUE, sizeof(TreeVertexStruct), (void*)offsetof(TreeVertexStruct,texcoord));
    //   glBindVertexArray(0);
    // }
  }
  //  uploadIndexData(uint* address, uint& indexOffset, uint& vertexOffset, WaveFrontObj& obj);
  // void uploadVertexData(TreeVertexStruct* vertexAddr, uint& vertexOffset, WaveFrontObj& obj, uint layer);
  // void loadTextures();
  // void loadShaders();
  // void setupFramebuffer();
  // GLuint loadShaderFromFile(const char* filename, GLenum shaderType);
  // void createInstances();
  // bool cullTerrain(vec4 pos);
  // bool treeProbable(int i, int j, int height);

  // MountainsDemo();
  // ~MountainsDemo();
  constructor(webgl) {
    console.log("> Initializing scene data...");

    // initialize camera matrix to identity matrix
    gl=webgl
    this.camera.position = glm.vec3(170, 25, 230);
    this.camera.rotation = glm.vec3(0, 150, 0);
    console.log(this.camera);

    this.transform.ProjectionMatrix = glm.perspective(
      45.0,
      4.0 / 3.0,
      0.1,
      1000.0
    );
    // instead of a standard perspective projection matrix we calculate our own
    // in order to get an infinite far clip plane that comes handy in case of
    // sky box rendering
    this.transform.InfProjectionMatrix = this.infPerspective(
      45.0,
      4.0 / 3.0,
      0.1
    );
    this.transform.Viewport = glm.vec4(0.0, 0.0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // create uniform buffer and store camera data
    // 创建缓冲区对象
    this.transformUB = gl.createBuffer();
    // 绑定缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, this.transformUB);
    // 向缓冲区写入数据
    gl.bufferData(gl.ARRAY_BUFFER, this.transform, gl.DYNAMIC_DRAW);
    // 绑定到索引 0
    // gl.bindBufferBase(gl.ARRAY_BUFFER, 0, this.transformUB);

    this.generateTerrain();
    this.loadMeshData();
    // this.loadTextures();
    // this.loadShaders();
    // this.setupFramebuffer();
    // this.createInstances();
    this.LODMode = false;
    this.showLODColor = false;

    console.log("> Configuring rendering environment...") 

    glPrimitiveRestartIndex(PRIMITIVE_RESTART_INDEX);
    glEnable(gl.PRIMITIVE_RESTART);
    glEnable(gl.CULL_FACE);

    (cerr << "> Done!") << endl;

    // GLenum glError;
    if ((glError = glGetError()) != GL_NO_ERROR) {
      ((cout << "Warning: OpenGL error code: ") << glError) << endl;
    }
  }

  // void moveCamera(float dx, float dy, float dz, float dtime);
  // void rotateCamera(float dx, float dy, float dz, float dtime);

  // void renderScene(float dtime);

  // void setDepthLOD(int lod) { this->LOD = lod; }
  // int getDepthLOD() { return this->LOD; }
  // void showDepth(bool show) { this->showDepthTex = show; }

  // void setCullMode(CullMode cullMode) { this->cullMode = cullMode; }
  // CullMode getCullMode() { return this->cullMode; }
  // void enableLOD() { this->LODMode = true; }
  // void disableLOD() { this->LODMode = false; }
  // bool isLODEnabled() { return this->LODMode; }
  // void showLOD(bool show) { this->showLODColor = show; }

  // int getDrawCalls() { return this->drawCallCount; }
  // float getMTris() {
  //     float numTris = this->visibleBlocks * this->terrainTriCount;
  //     for (int i=0; i<NUM_LOD; i++) numTris += this->visibleTrees[i] * this->treeTriCount[i];
  //     return numTris / 1000000.f;
  // }
}
