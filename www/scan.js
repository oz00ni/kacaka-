// This is a JavaScript file

var DetectedCount=0,DetectedCode="";
var video,tmp,tmp_ctx,jan,prev,prev_ctx,w,h,mw,mh,x1,y1;
window.addEventListener('load',function(event){
  video=document.createElement('video');
  video.setAttribute("autoplay","");
  video.setAttribute("muted","");
  video.setAttribute("playsinline","");
  video.onloadedmetadata = function(e){video.play();};
  prev=document.getElementById("preview");
  prev_ctx=prev.getContext("2d");
  tmp = document.createElement('canvas');
  tmp_ctx = tmp.getContext("2d");
  jan=document.getElementById("jan");

  //カメラ使用の許可ダイアログが表示される
  navigator.mediaDevices.getUserMedia(
    //マイクはオフ, カメラの設定   背面カメラを希望する 640×480を希望する
    {"audio":false,
    "video":{"facingMode":"environment",
             "width":{"ideal":640},"height":{"ideal":480}
             }
    }
  ).then( //許可された場合
    function(stream){
      video.srcObject = stream;
      //1.5秒毎にスキャンする
      setTimeout(Scan,1500,true);
    }
  ).catch( //許可されなかった場合
    function(err){jan.value+=err+'\n';}
  );

  

  function Scan(first){
    if(first){
      //選択された幅高さ
      w=video.videoWidth;
      h=video.videoHeight;
      //画面上の表示サイズ
      prev.style.width=(w/2)+"px";
      prev.style.height=(h/2)+"px";
      
      //内部のサイズ
      prev.setAttribute("width",w);
      prev.setAttribute("height",h);
      mw=w*0.5;
      mh=w*0.2;
      x1=(w-mw)/2;
      y1=(h-mh)/2;
    }
    prev_ctx.drawImage(video,0,0,w,h);
    prev_ctx.beginPath();
    prev_ctx.strokeStyle="rgb(15,200,255)";
    prev_ctx.lineWidth=10;
    prev_ctx.rect(x1,y1,mw,mh);
    prev_ctx.stroke();
    tmp.setAttribute("width",mw);
    tmp.setAttribute("height",mh);
    tmp_ctx.drawImage(prev,x1,y1,mw,mh,0,0,mw,mh);

    tmp.toBlob(function(blob){
      var reader = new FileReader();
      reader.onload=function(){
        var config={
          decoder: {
            readers: ["ean_reader","ean_8_reader"],
            multiple: false, //同時に複数のバーコードを解析しない
          },
          locator:{patchSize:"large",halfSample:false},
          locate:false,
          src:reader.result,
        };
        Quagga.decodeSingle(config,function(){});
      }
      reader.readAsDataURL(blob);
    });
    setTimeout(Scan,700,false);
  }

  Quagga.onDetected(async function (result) {
    //読み取り誤差が多いため、3回連続で同じ値だった場合に成功とする
    if(DetectedCode==result.codeResult.code){
      DetectedCount++;
    }else{
      DetectedCount=0;
      DetectedCode=result.codeResult.code;
    }
    if(DetectedCount==3){
      console.log(result.codeResult.code);
      
      var numq = Number(result.codeResult.code);
      $q.value = numq;
      
      DetectedCount=0;
      
      //サーチ処理を直接呼び出す
      console.log("DBG:"+$q.value+"///");
      var itemData = await searchBooks($q.value);
      console.log("結果：" + JSON.stringify(itemData));    
      // html に変換して表示用 DOM に代入

     var textsData = itemData.map(item => {
      return `
      <a class='f border bg-white mb8' href='${item.link}', target='_blank'>
        <img class='w100 object-fit-contain bg-gray' src='${item.image}' />
        <div class='p16'>
          <h3 class='mb8'>${item.title}</h3>
          <p class='line-clamp-2'>${item.description}</p>
        </div>
      </div>`;
    });
    $results.innerHTML = textsData.join('');


    //仮代入
    //$results.innerHTML = JSON.stringify(itemData);
    $q.value = '';
  


    }
  });
});




window.onload = async function() {
  // 検索する
  var search = async () => {
    // 入力された値でを本を検索
    if($q.value == ''){

    }else{
    var items = await searchBooks($q.value);
    }
    
    console.log("search(Items):" + JSON.stringify(items) );

    // html に変換して表示用 DOM に代入
    var texts = items.map(item => {
      return `
      <a class='f border bg-white mb8' href='${item.link}', target='_blank'>
        <img class='w100 object-fit-contain bg-gray' src='${item.image}' />
        <div class='p16'>
          <h3 class='mb8'>${item.title}</h3>
          <p class='line-clamp-2'>${item.description}</p>
        </div>
      </div>`;
    });
    $results.innerHTML = texts.join('');
    $q.value = '';
  };
  
  // 入力するたびに検索( debounce で API 連打対策 )
  $q.oninput = _.debounce(search, 256);
  
  // フォーカスしたら全文字選択
  $q.onfocus = () => { $q.select(); };
  
  // 初期値設定
  $q.value = '';
};

// 本を検索して結果を返す
var searchBooks = async (query) => {
    console.log("searchBooks:" + query);
  
  // Google Books APIs のエンドポイント
  var endpoint = 'https://www.googleapis.com/books/v1';
  // 検索 API を叩く
  var res = await fetch(`${endpoint}/volumes?q=isbn:${$q.value}`);
 
  console.log("searchBooks(res):" );
 
  // JSON に変換
  var data = await res.json();
  console.log("searchBooks(data):" + JSON.stringify(data) );


  // 必要なものだけ抜き出してわかりやすいフォーマットに変更する
  var items = data.items.map(item => {
    var vi = item.volumeInfo;
    return {
      title: vi.title,
      description: vi.description,
      link: vi.infoLink,
      image: vi.imageLinks ? vi.imageLinks.smallThumbnail : '',
    }; 
  });
  console.log("searchBooks(Items):" + JSON.stringify(items) );

  return items;

};