function LoadingCard() {
  return (
    <div className="flex-center h-full p-4 md:p-6 rounded-xl">
      <div className="text-gray-500 font-medium text-[25px] h-10 px-2 flex rounded-md">
        <p>loading</p>
        <div className="overflow-hidden relative words">
          <span className="block h-full pl-2 text-[#956afa] animate-word-spin">
            expenses
          </span>
          <span className="block h-full pl-2 text-[#956afa] animate-word-spin">
            groups
          </span>
          <span className="block h-full pl-2 text-[#956afa] animate-word-spin">
            members
          </span>
          <span className="block h-full pl-2 text-[#956afa] animate-word-spin">
            recent activity
          </span>
          <span className="block h-full pl-2 text-[#956afa] animate-word-spin">
            expenses
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoadingCard;
