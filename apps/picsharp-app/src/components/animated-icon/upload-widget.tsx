import { Images } from 'lucide-react';

export default function UploadWidget() {
  return (
    <div className='group relative'>
      {/* <div className='relative z-40 mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl transition-all duration-500 group-hover:-translate-y-8 group-hover:translate-x-8 group-hover:bg-neutral-800 group-hover:shadow-2xl'> */}
      <div className='relative z-40 mx-auto flex h-32 w-32 -translate-y-8 translate-x-8 cursor-pointer items-center justify-center rounded-xl bg-neutral-800/90 shadow-2xl transition-all duration-500'>
        <Images size={24} className='text-neutral-400/80' />
      </div>
      {/* <div className='absolute inset-0 z-30 mx-auto flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-neutral-100 bg-transparent opacity-0 transition-all duration-300 group-hover:opacity-80'></div> */}
      <div className='absolute inset-0 z-30 mx-auto flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-neutral-100 bg-transparent opacity-80 transition-all duration-300'></div>
    </div>
  );
}
