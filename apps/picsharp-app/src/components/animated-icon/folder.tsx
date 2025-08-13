function Folder() {
  return (
    <div className='file relative z-50 h-40 w-60 origin-bottom cursor-pointer [perspective:1500px]'>
      <div className="work-5 ease relative h-full w-full origin-top rounded-2xl rounded-tl-none bg-amber-600 transition-all duration-300 before:absolute before:-top-[15px] before:left-[75.5px] before:h-4 before:w-4 before:bg-amber-600 before:content-[''] before:[clip-path:polygon(0_35%,0%_100%,50%_100%);] after:absolute after:bottom-[99%] after:left-0 after:h-4 after:w-20 after:rounded-t-2xl after:bg-amber-600 after:content-[''] group-hover:shadow-[0_20px_40px_rgba(0,0,0,.2)]" />
      <div className='work-4 ease absolute inset-1 origin-bottom select-none rounded-2xl bg-zinc-400 transition-all duration-300 group-hover:[transform:rotateX(-20deg)]' />
      <div className='work-3 ease absolute inset-1 origin-bottom rounded-2xl bg-zinc-300 transition-all duration-300 group-hover:[transform:rotateX(-30deg)]' />
      <div className='work-2 ease absolute inset-1 origin-bottom rounded-2xl bg-zinc-200 transition-all duration-300 group-hover:[transform:rotateX(-38deg)]' />
      <div className="work-1 ease absolute bottom-0 flex h-[156px] w-full origin-bottom items-end rounded-2xl rounded-tr-none bg-gradient-to-t from-amber-500 to-amber-400 transition-all duration-300 before:absolute before:-top-[10px] before:right-[142px] before:size-3 before:bg-amber-400 before:content-[''] before:[clip-path:polygon(100%_14%,50%_100%,100%_100%);] after:absolute after:bottom-[99%] after:right-0 after:h-[16px] after:w-[146px] after:rounded-t-2xl after:bg-amber-400 after:content-[''] group-hover:shadow-[inset_0_20px_40px_#fbbf24,_inset_0_-20px_40px_#d97706] group-hover:[transform:rotateX(-46deg)_translateY(1px)]" />
    </div>
  );
}

export default Folder;
