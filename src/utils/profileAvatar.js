export async function prepareProfileAvatar(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('اختر صورة JPG أو PNG أو WebP لا تتجاوز 5 ميغابايت.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>25000000)throw Error('أبعاد الصورة كبيرة جداً. اختر صورة أصغر.');
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d');if(!context)throw Error('تعذر تجهيز الصورة.');
    context.fillStyle='#eef5f1';context.fillRect(0,0,256,256);
    const side=Math.min(image.naturalWidth,image.naturalHeight);
    context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
    const result=canvas.toDataURL('image/jpeg',.82);
    if(result.length>90000)throw Error('الصورة كبيرة جداً. اختر صورة أبسط.');
    return result;
  }finally{URL.revokeObjectURL(url);}
}
