"use client";

import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  CloudLightningIcon,
  GroupIcon,
  SquareSplitHorizontalIcon,
} from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

export function FeatureCards() {
  const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: true }));

  const FEATURES_LIST = [
    {
      name: "Flexible Splits",
      description:
        "Equal, shares, percentages, exact amounts — your group, your rules.",
      icon: <SquareSplitHorizontalIcon size={28} />,
    },
    {
      name: "Multiple Groups",
      description: "Trips, housemates, projects — track each separately.",
      icon: <GroupIcon size={28} />,
    },
    {
      name: "Real-time Sync",
      description: "All updates are reflected instantly across all devices.",
      icon: <CloudLightningIcon size={28} />,
    },
  ];

  return (
    <section className="flex flex-col-reverse md:flex-row w-full border shadow-sm rounded-xl overflow-hidden">
      <div className="w-full md:w-1/2 flex items-center justify-center text-center md:text-left bg-card text-card-foreground min-h-40">
        <div className="max-w-md">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Why BuddyBills?
          </h2>
          <Carousel
            plugins={[plugin.current]}
            className="w-full max-w-[280px] sm:max-w-[420px] md:max-w-[320px] lg:max-w-[420px] order-2 md:order-1"
            onMouseEnter={plugin.current.stop}
          >
            <CarouselContent>
              {FEATURES_LIST.map(({ name, description, icon }, index) => (
                <CarouselItem key={index} className="max-w-full">
                  <div className="flex gap-2.5 items-center">
                    {icon}
                    <h3 className="font-semibold text-xl md:text-2xl lg:text-3xl">
                      {name}
                    </h3>
                  </div>
                  <p className="text-base md:text-lg lg:text-xl text-muted-foreground">
                    {description}
                  </p>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
      <div
        className={`w-full md:w-1/2 flex items-center justify-center dark:bg-[#131625]`}
      >
        <div className="relative w-full max-w-[420px] h-[280px]">
          <Image
            src="assets/hero.svg"
            alt="Hero Image"
            fill
            className="object-contain dark:hidden"
            priority
          />
          <Image
            src="assets/hero-dark.svg"
            alt="Hero Image"
            fill
            className="object-contain hidden dark:block"
            priority
          />
        </div>
      </div>
    </section>
  );
}
