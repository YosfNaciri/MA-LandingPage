import React from "react";

type SectorCardProps = {
  title: string;
  img: string;
};

const SectorCard: React.FC<SectorCardProps> = ({ title, img }) => {
  return (
    <div className="bg-white rounded-2xl p-6 text-center w-90  hover:shadow-2xl">
      <div className="flex justify-center mb-4">
        <img src={img} className="w-80 h-50 object-cover" />
      </div>
      <h3 className="text-xl font-semibold text-[#2D2E32] mb-2">{title}</h3>
    </div>
  );
};

export default SectorCard;
