import Image from "next/image";

type TrainerSpriteAvatarProps = {
  name: string;
  size: number;
};

export default function TrainerSpriteAvatar({
  name,
  size,
}: TrainerSpriteAvatarProps) {
  return (
    <Image
      src={`/trainer-sprites/${encodeURIComponent(name)}.png`}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-contain"
      height={size}
      width={size}
    />
  );
}
