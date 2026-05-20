"use client";
import { useState, useEffect } from "react";
import coreApi from "@/utils/coreApi";
import { useRouter } from "next/navigation";
import CallPage from '@/components/CallPage';
import { LogIn } from "lucide-react";


export default function Page() {
    const router = useRouter();
    const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);
    const [data, setData] = useState<Record<string, any[]>>({});
    const [user, setUser] = useState<any>(null);
    const [file, setFile] = useState<Record<string, string>>({});
    // ====================
    // Fetch Collection
    // ====================
    const fetchData = async (
        collectionName: string,
        fromOthers?: string
    ) => {
        const who = fromOthers ? fromOthers : "#self";
        const result = await coreApi.getStorageItems(
            who,
            collectionName,
            "#null"
        );
        coreApi.putRecords(
            collectionName,
            result?.[collectionName] || []
        );
    };
    const loadData = async (
        stateKey: string,
        collectionName: string,
        filter: any
    ) => {
        const records = coreApi.findRecords(
            collectionName,
            filter
        );
        setData((prev) => ({
            ...prev ?? [],
            [stateKey]: records,
        }));
    };
    // ====================
    // Set Here All To Load
    // ====================
    const whatToDo = async () => {
        try {

        } catch (e) {
            coreApi.alert(e?.toString() || "An error occured. Please refresh the page.", "#EEEEEE");
        }
    };
    const whatToDoWhenUserLoaded = async () => {
        try {
            if (!user) return;
        } catch (e) {
            coreApi.alert(e?.toString() || "An error occured. Please refresh the page.", "#EEEEEE");
        }
    }
    const whatToDoWhenDataLoaded = async () => {
        try {
            if (!data) return;

        } catch (e) {
            coreApi.alert(e?.toString() || "An error occured. Please refresh the page.", "#EEEEEE");
        }
    }
    useEffect(() => {
        if (coreApi.isLogin()) {
            whatToDo();
            setIsClientLoaded(true);
        } else {
            (async ()=>{await coreApi.login("magic", "magic");})()
        }
        return () => {
            // clean-up
        };
    }, []);
    useEffect(() => {
        whatToDoWhenUserLoaded();
    }, [user]);
    useEffect(() => {
        whatToDoWhenDataLoaded();
    }, [data]);
    // ====================
    // Set Here All Other
    // ====================
    if (!isClientLoaded) return null;



    return <CallPage
        serverUrl="https://core-api-v2.onrender.com"
        userId="meow"
        displayName="anonymous"
        rooms={[
            {
                id: "Ayouni-HBD",
                name: "Ayouni",
            }
        ]}
    />
}