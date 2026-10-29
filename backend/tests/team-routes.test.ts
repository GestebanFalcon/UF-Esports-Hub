import { describe, expect, test } from "bun:test";
import express, { type RequestHandler } from "express";
import { createTeamRouter, TeamConflictError, type TeamStore } from "../src/routes/teams/index.js";
import type { TeamResponse } from "@uf-esports-hub/shared";

const A="11111111-1111-4111-8111-111111111111", B="22222222-2222-4222-8222-222222222222";
const TEAM="33333333-3333-4333-8333-333333333333";
async function serverSetup() {
  const teams=new Map<string,TeamResponse>();
  let serial=0;
  const store: TeamStore={
    async list(){return [...teams.values()];},
    async detail(id){return teams.get(id)??null;},
    async create(managerId,data){
      if([...teams.values()].some(t=>t.name===data.name))throw new TeamConflictError();
      const id=serial++===0?TEAM:"44444444-4444-4444-8444-444444444444";
      const created={id,managerId,...data};teams.set(id,created);return created;
    },
    async update(id,managerId,data){
      const old=teams.get(id);if(!old||old.managerId!==managerId)return null;
      if(data.name && [...teams.values()].some(t=>t.id!==id&&t.name===data.name))throw new TeamConflictError();
      const updated={...old,...data};teams.set(id,updated);return updated;
    }
  };
  // Test-only verified identities; NOT authentication implementation.
  const authenticate:RequestHandler=(req,res,next)=>{
    const token=req.headers.authorization;
    if(token==="Bearer manager-a")res.locals.verifiedTeamIdentity={id:A,role:"manager"};
    else if(token==="Bearer manager-b")res.locals.verifiedTeamIdentity={id:B,role:"manager"};
    else if(token==="Bearer player")res.locals.verifiedTeamIdentity={id:B,role:"player"};
    else if(token==="Bearer admin")res.locals.verifiedTeamIdentity={id:B,role:"admin"};
    else return void res.status(401).json({message:"Authentication required."});
    next();
  };
  const app=express();app.use(express.json());app.use("/api/teams",createTeamRouter({authenticate,store}));
  const server=app.listen(0);const addr=server.address();
  if(!addr||typeof addr==="string")throw Error("No server port");
  async function send(method:string,path="",body?:unknown,token="manager-a"){
    return fetch(`http://127.0.0.1:${addr.port}/api/teams${path}`,{
      method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}),...(body===undefined?{}:{"Content-Type":"application/json"})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
  }
  return {send,teams,close:()=>new Promise<void>(resolve=>server.close(()=>resolve()))};
}
const valid={name:"Gator Valorant",game:"Valorant",description:"Competitive team"};
describe("PBI-10 team routes",()=>{
  test("manager creates, lists, reads, and updates persisted team",async()=>{
    const s=await serverSetup();try{
      const created=await s.send("POST","",valid);
      expect(created.status).toBe(201);expect((await created.json()).managerId).toBe(A);
      expect((await(await s.send("GET")).json()).teams).toHaveLength(1);
      expect((await s.send("GET","/"+TEAM)).status).toBe(200);
      const updated=await s.send("PATCH","/"+TEAM,{description:"Updated"});
      expect(updated.status).toBe(200);
      expect((await(await s.send("GET","/"+TEAM)).json()).description).toBe("Updated");
    }finally{await s.close();}
  });
  test("manager B cannot update manager A team",async()=>{
    const s=await serverSetup();try{
      await s.send("POST","",valid);
      expect((await s.send("PATCH","/"+TEAM,{name:"Stolen"}, "manager-b")).status).toBe(404);
      expect(s.teams.get(TEAM)?.name).toBe(valid.name);
    }finally{await s.close();}
  });
  test("anonymous, player, and admin writes are rejected",async()=>{
    const s=await serverSetup();try{
      expect((await s.send("POST","",valid,"")).status).toBe(401);
      expect((await s.send("POST","",valid,"player")).status).toBe(403);
      expect((await s.send("POST","",valid,"admin")).status).toBe(403);
    }finally{await s.close();}
  });
  test("unknown owner, role and malformed fields rejected",async()=>{
    const s=await serverSetup();try{
      for(const body of [{...valid,managerId:B},{...valid,role:"admin"},{...valid,name:""},{...valid,game:""}])
        expect((await s.send("POST","",body)).status).toBe(400);
      expect((await s.send("POST","",valid)).status).toBe(201);
      expect((await s.send("PATCH","/"+TEAM,{managerId:B})).status).toBe(400);
      expect((await s.send("PATCH","/"+TEAM,{})).status).toBe(400);
    }finally{await s.close();}
  });
  test("missing and invalid IDs; name conflict",async()=>{
    const s=await serverSetup();try{
      expect((await s.send("GET","/bad-id")).status).toBe(400);
      expect((await s.send("GET","/"+TEAM)).status).toBe(404);
      expect((await s.send("PATCH","/"+TEAM,{name:"New"})).status).toBe(404);
      await s.send("POST","",valid);
      expect((await s.send("POST","",valid)).status).toBe(409);
    }finally{await s.close();}
  });
});
